//go:build windows

package tracemanager

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// The DigitalPersona debug components each export gettraceinfo/settraceinfo
// (ordinals 26/27) plus get_lastknownversion (25). This file reproduces the
// legacy debugus_impl::optionizeddll_t round-trip: load the component DLLs,
// read their self-describing category text, and write it back. When those DLLs
// are not installed it falls back to the built-in tables whose active state is
// kept in the registry (HKLM\SOFTWARE\DigitalPersona\Tracing, value ots_<name>).

const dllVersionExpected = 200 // debugus::version::lastknownversion (2.00)

const (
	tracingKeyPath  = `SOFTWARE\DigitalPersona\Tracing`
	tracingValuePfx = "ots_"
)

// componentDLLs mirrors debugus_impl::build_dllnames.
var componentDLLs = []string{
	"dpofeedb.dll",
	"dpfbview.dll",
	"dpfillin.dll",
	"dpocache.dll",
	`firefoxext\components\dpffcli.dll`,
	"dpotspluginie8.dll",
}

func platformLoadCategories() ([]SectionDescription, error) {
	if sections := loadViaDLL(); len(sections) > 0 {
		return sections, nil
	}
	return loadViaRegistry(), nil
}

func platformSaveCategories(sections []SectionDescription) error {
	if saveViaDLL(sections) {
		return nil
	}
	return saveViaRegistry(sections)
}

// ---------------------------------------------------------------------------
// DLL round-trip

type componentDLL struct {
	handle     windows.Handle
	getInfo    uintptr
	setInfo    uintptr
	getVersion uintptr
}

func loadComponentDLLs() []componentDLL {
	binDir := dpBinDir()
	if binDir == "" {
		return nil
	}

	var dlls []componentDLL
	for _, name := range componentDLLs {
		path := filepath.Join(binDir, name)
		h, err := windows.LoadLibrary(path)
		if err != nil {
			continue
		}

		get, _ := windows.GetProcAddress(h, "gettraceinfo")
		set, _ := windows.GetProcAddress(h, "settraceinfo")
		ver, _ := windows.GetProcAddress(h, "get_lastknownversion")
		if get == 0 || set == 0 || ver == 0 {
			windows.FreeLibrary(h)
			continue
		}

		// Only talk to a component whose ABI version matches, exactly like the
		// original validated_version() guard.
		if r, _, _ := syscall.SyscallN(ver); int32(r) != dllVersionExpected {
			windows.FreeLibrary(h)
			continue
		}

		dlls = append(dlls, componentDLL{handle: h, getInfo: get, setInfo: set, getVersion: ver})
	}
	return dlls
}

func freeComponentDLLs(dlls []componentDLL) {
	for _, d := range dlls {
		windows.FreeLibrary(d.handle)
	}
}

func loadViaDLL() []SectionDescription {
	dlls := loadComponentDLLs()
	if len(dlls) == 0 {
		return nil
	}
	defer freeComponentDLLs(dlls)

	var combined strings.Builder
	for _, d := range dlls {
		r, _, _ := syscall.SyscallN(d.getInfo)
		if r == 0 {
			continue
		}
		ptr := *(*unsafe.Pointer)(unsafe.Pointer(&r))
		combined.WriteString(windows.BytePtrToString((*byte)(ptr)))
	}

	return parseTraceInfo(combined.String())
}

func saveViaDLL(sections []SectionDescription) bool {
	dlls := loadComponentDLLs()
	if len(dlls) == 0 {
		return false
	}
	defer freeComponentDLLs(dlls)

	payload := buildTraceInfo(sections)
	bytes, err := windows.BytePtrFromString(payload)
	if err != nil {
		return false
	}

	// Every DLL receives the full payload and extracts its own section, exactly
	// like entrypoint_import.
	for _, d := range dlls {
		syscall.SyscallN(d.setInfo, uintptr(unsafe.Pointer(bytes)))
	}
	return true
}

// ---------------------------------------------------------------------------
// Registry fallback (built-in descriptions + ots_<name> bitmasks)

func loadViaRegistry() []SectionDescription {
	masks := map[string]uint32{}

	key, err := registry.OpenKey(registry.LOCAL_MACHINE, tracingKeyPath, registry.QUERY_VALUE|registry.WOW64_32KEY)
	if err == nil {
		defer key.Close()
		for _, bs := range builtinSections {
			if v, _, e := key.GetIntegerValue(tracingValuePfx + bs.name); e == nil {
				masks[bs.name] = uint32(v)
			}
		}
	}

	return builtinSectionsCopy(masks)
}

func saveViaRegistry(sections []SectionDescription) error {
	key, _, err := registry.CreateKey(registry.LOCAL_MACHINE, tracingKeyPath, registry.SET_VALUE|registry.WOW64_32KEY)
	if err != nil {
		return err
	}
	defer key.Close()

	for _, s := range sections {
		if err := key.SetDWordValue(tracingValuePfx+s.SectionName, maskFromSection(s)); err != nil {
			return err
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// DigitalPersona bin directory lookup (subset of dp_binlocation.h)

func dpBinDir() string {
	candidates := []struct {
		path string
	}{
		{`SOFTWARE\DigitalPersona\Applications\OTS`},
		{`SOFTWARE\DigitalPersona\Applications`},
	}

	for _, view := range []uint32{registry.WOW64_32KEY, registry.WOW64_64KEY} {
		for _, c := range candidates {
			key, err := registry.OpenKey(registry.LOCAL_MACHINE, c.path, registry.QUERY_VALUE|view)
			if err != nil {
				continue
			}
			v, _, e := key.GetStringValue("BinDir")
			key.Close()
			if e == nil && v != "" {
				return v
			}
		}
	}

	// Default location based on the environment, matching getdefualtvalueBINDIR.
	if pf := os.Getenv("ProgramFiles"); pf != "" {
		return filepath.Join(pf, "DigitalPersona", "Bin")
	}
	return ""
}
