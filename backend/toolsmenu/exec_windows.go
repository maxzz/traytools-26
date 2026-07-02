//go:build windows

package toolsmenu

import (
	"fmt"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	shell32       = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW = shell32.NewProc("ShellExecuteW")
)

// platformExecTool launches a file, folder, shortcut, or URL via ShellExecute,
// which honours file associations and the shell "open" verb. A directory target
// opens Explorer; a URL opens the default browser; an .exe/.bat runs.
func platformExecTool(target, args string) error {
	if strings.TrimSpace(target) == "" {
		return fmt.Errorf("tools: empty command")
	}

	verb, err := windows.UTF16PtrFromString("open")
	if err != nil {
		return err
	}
	file, err := windows.UTF16PtrFromString(target)
	if err != nil {
		return err
	}

	var paramsArg uintptr
	if strings.TrimSpace(args) != "" {
		params, err := windows.UTF16PtrFromString(args)
		if err != nil {
			return err
		}
		paramsArg = uintptr(unsafe.Pointer(params))
	}

	ret, _, callErr := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(file)),
		paramsArg,
		0,
		uintptr(windows.SW_SHOWNORMAL),
	)
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("failed to open %q: %w", target, callErr)
		}
		return fmt.Errorf("failed to open %q (ShellExecute code %d)", target, ret)
	}
	return nil
}

// regRoots maps the short and long registry hive prefixes to their canonical
// long form used by regedit's "LastKey".
var regRoots = []struct {
	short string
	long  string
}{
	{"HKLM", "HKEY_LOCAL_MACHINE"},
	{"HKCU", "HKEY_CURRENT_USER"},
	{"HKCR", "HKEY_CLASSES_ROOT"},
	{"HKCC", "HKEY_CURRENT_CONFIG"},
	{"HKU", "HKEY_USERS"},
}

// canonRegKey converts a config key path (e.g. "HKLM\SOFTWARE\...") into the
// full "HKEY_LOCAL_MACHINE\SOFTWARE\..." form, normalising slashes.
func canonRegKey(key string) (string, error) {
	key = strings.TrimSpace(key)
	key = strings.ReplaceAll(key, "/", `\`)
	key = strings.TrimPrefix(key, `\`)
	if key == "" {
		return "", fmt.Errorf("tools: empty registry key")
	}

	upper := strings.ToUpper(key)

	// Already fully qualified.
	for _, r := range regRoots {
		if upper == r.long || strings.HasPrefix(upper, r.long+`\`) {
			return key, nil
		}
	}

	// Short prefix: replace the first path segment.
	slash := strings.IndexByte(key, '\\')
	head := key
	rest := ""
	if slash >= 0 {
		head = key[:slash]
		rest = key[slash:]
	}
	for _, r := range regRoots {
		if strings.EqualFold(head, r.short) {
			return r.long + rest, nil
		}
	}

	return "", fmt.Errorf("tools: unknown registry root in %q", key)
}

// platformOpenRegistry opens the Registry Editor pre-navigated to the given key.
// It writes regedit's "LastKey" then launches regedit, which restores it on
// start. This is the reliable modern equivalent of the legacy keystroke-driven
// navigation.
func platformOpenRegistry(key, _plat string) error {
	full, err := canonRegKey(key)
	if err != nil {
		return err
	}

	last, _, err := registry.CreateKey(registry.CURRENT_USER,
		`Software\Microsoft\Windows\CurrentVersion\Applets\Regedit`, registry.SET_VALUE)
	if err == nil {
		last.SetStringValue("LastKey", `Computer\`+full)
		last.Close()
	}

	return platformExecTool("regedit.exe", "")
}
