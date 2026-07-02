//go:build windows

package tracemanager

import (
	"fmt"
	"os/exec"
	"strings"

	"golang.org/x/sys/windows/registry"
)

// tracingRoot is the registry key the legacy DP tracing stored per-component
// bitmasks under. Each DWORD value "ots_<component>" is a categories_t bitmask.
const tracingRoot = `SOFTWARE\DigitalPersona\Tracing`

// regeditLastKeyPath is where regedit stores the last selected key; writing
// the desired key here before launching regedit makes it open there.
const regeditLastKeyPath = `Software\Microsoft\Windows\CurrentVersion\Applets\Regedit`

const defaultRegeditKey = `HKEY_LOCAL_MACHINE\SOFTWARE\DigitalPersona\Tracing`

// loadCategories reads every DWORD value under tracingRoot and presents each
// one as a section of 32 bit-level categories. The legacy code obtained the
// descriptions from the component DLLs; without them we label each bit
// "Category <n>", which is the same granularity the bitmask supports.
func loadCategories() ([]SectionDescription, error) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, tracingRoot, registry.READ)
	if err != nil {
		// No tracing key yet -> nothing to configure. Return an empty list; the
		// UI will show the empty state and Save will create values on demand.
		return []SectionDescription{}, nil
	}
	defer key.Close()

	valueNames, err := key.ReadValueNames(-1)
	if err != nil {
		return nil, fmt.Errorf("tracemanager: read values: %w", err)
	}

	sections := make([]SectionDescription, 0, len(valueNames))
	for _, name := range valueNames {
		val, _, err := key.GetIntegerValue(name)
		if err != nil {
			continue // skip non-DWORD values
		}
		section := sectionFromBitmask(name, uint32(val))
		sections = append(sections, section)
	}
	return sections, nil
}

// saveCategories writes each section's active bits back as a DWORD bitmask
// under the tracing root. Missing values are created; the key is created if
// needed (Save requires elevation, which the host app opts into).
func saveCategories(sections []SectionDescription) error {
	key, _, err := registry.CreateKey(registry.LOCAL_MACHINE, tracingRoot, registry.SET_VALUE|registry.CREATE_SUB_KEY)
	if err != nil {
		return fmt.Errorf("tracemanager: open tracing root: %w", err)
	}
	defer key.Close()

	for _, s := range sections {
		if s.SectionName == "" {
			continue
		}
		var mask uint32
		for _, d := range s.StringDescriptions {
			if d.Active {
				bit := d.MemID
				if bit >= 0 && bit < 32 {
					mask |= 1 << bit
				}
			}
		}
		if err := key.SetDWordValue(s.SectionName, uint32(mask)); err != nil {
			return fmt.Errorf("tracemanager: set %q: %w", s.SectionName, err)
		}
	}
	return nil
}

// sectionFromBitmask expands a DWORD bitmask into 32 StringDescriptions, one
// per bit, with Active reflecting the stored bit.
func sectionFromBitmask(name string, mask uint32) SectionDescription {
	descs := make([]StringDescription, 32)
	for i := 0; i < 32; i++ {
		descs[i] = StringDescription{
			MemID:       i,
			Active:      mask&(1<<i) != 0,
			Description: fmt.Sprintf("Category %d", i),
		}
	}
	return SectionDescription{
		SectionName:        name,
		StringDescriptions: descs,
	}
}

// openRegedit writes the requested key as regedit's LastKey and launches
// regedit, which opens at that key. The key is normalized to the full
// "HKEY_LOCAL_MACHINE\..." form regedit expects.
func openRegedit(key string) error {
	full := normalizeRegeditKey(key)
	if err := setRegeditLastKey(full); err != nil {
		return err
	}
	cmd := exec.Command("regedit.exe")
	return cmd.Start()
}

// setRegeditLastKey stores the key path regedit should select on launch.
func setRegeditLastKey(key string) error {
	k, _, err := registry.CreateKey(registry.CURRENT_USER, regeditLastKeyPath, registry.SET_VALUE|registry.CREATE_SUB_KEY)
	if err != nil {
		return fmt.Errorf("tracemanager: open regedit lastkey: %w", err)
	}
	defer k.Close()
	return k.SetStringValue("LastKey", key)
}

// normalizeRegeditKey maps a short root alias (HKLM\...) to the full form
// regedit stores (HKEY_LOCAL_MACHINE\...).
func normalizeRegeditKey(key string) string {
	key = strings.TrimSpace(key)
	repl := []struct{ short, full string }{
		{"HKLM\\", "HKEY_LOCAL_MACHINE\\"},
		{"HKCU\\", "HKEY_CURRENT_USER\\"},
		{"HKCR\\", "HKEY_CLASSES_ROOT\\"},
		{"HKU\\", "HKEY_USERS\\"},
	}
	for _, r := range repl {
		if strings.HasPrefix(key, r.short) {
			return r.full + key[len(r.short):]
		}
	}
	// Strip a leading backslash for keys pasted in as "\HKEY_LOCAL_MACHINE\...".
	return strings.TrimPrefix(key, "\\")
}

// exportTrace mirrors the legacy OnAppTraceExp: rundll32 the dpocache.dll
// trace-export entrypoint, then open the produced otstrace.txt in notepad.
// Both binaries may be absent on a clean machine; failures are returned so the
// UI can report them.
func exportTrace() error {
	if err := runDpocache("trace exp"); err != nil {
		return err
	}
	// Best-effort open of the trace text file; not fatal if notepad/the file
	// is missing.
	_ = exec.Command("notepad.exe", "otstrace.txt").Start()
	return nil
}

// importTrace mirrors the legacy OnAppTraceImp.
func importTrace() error {
	return runDpocache("trace imp")
}

// runDpocache shells out to rundll32 with the dpocache.dll trace entrypoint,
// replicating the exact command form the legacy code used.
func runDpocache(args string) error {
	cmd := exec.Command("rundll32.exe", "dpocache.dll", args)
	return cmd.Start()
}
