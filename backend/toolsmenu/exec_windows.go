//go:build windows

package toolsmenu

import (
	"fmt"
	"strings"
	"syscall"
	"unsafe"

	"tm-template-go-26/backend/winregedit"

	"golang.org/x/sys/windows"
)

var (
	shell32       = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW = shell32.NewProc("ShellExecuteW")
)

// platformExecTool launches a file, folder, shortcut, or URL via ShellExecute,
// which honours file associations and the shell "open" verb. A directory target
// opens Explorer; a URL opens the default browser; an .exe/.bat runs. When
// elevated is true the "runas" verb is used so the target starts with
// administrator privileges (triggering a UAC prompt when needed).
func platformExecTool(target, args string, elevated bool) error {
	if strings.TrimSpace(target) == "" {
		return fmt.Errorf("tools: empty command")
	}

	verbStr := "open"
	if elevated {
		verbStr = "runas"
	}
	verb, err := windows.UTF16PtrFromString(verbStr)
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

// platformOpenRegistry opens the Registry Editor navigated to the given key.
// The heavy lifting (hive resolution, LastKey fast path, and keystroke tree
// navigation for an already-running regedit) lives in the shared winregedit
// package. cmdPlat is accepted for schema compatibility but has no effect: the
// modern Registry Editor is a single unified 32/64-bit view. The elevated flag
// is likewise accepted for signature parity: regedit.exe carries a
// requireAdministrator manifest and always self-elevates, so no explicit
// "runas" launch is needed here.
func platformOpenRegistry(key, _plat string, _elevated bool) error {
	return winregedit.Jump(key)
}
