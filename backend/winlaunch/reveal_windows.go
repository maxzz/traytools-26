//go:build windows

package winlaunch

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// RevealInExplorer opens File Explorer with path selected (highlighted).
func RevealInExplorer(path string) error {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return fmt.Errorf("reveal: empty path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	if _, err := os.Stat(abs); err != nil {
		return fmt.Errorf("reveal: %w", err)
	}

	// Quote the path inside /select so spaces (e.g. "Program Files") parse
	// correctly. Without quotes, explorer often opens the Documents folder.
	params := `/select,"` + abs + `"`

	verb, err := windows.UTF16PtrFromString("open")
	if err != nil {
		return err
	}
	file, err := windows.UTF16PtrFromString("explorer.exe")
	if err != nil {
		return err
	}
	paramsPtr, err := windows.UTF16PtrFromString(params)
	if err != nil {
		return err
	}

	ret, _, callErr := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(file)),
		uintptr(unsafe.Pointer(paramsPtr)),
		0,
		uintptr(windows.SW_SHOWNORMAL),
	)
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("reveal: %w", callErr)
		}
		return fmt.Errorf("reveal: ShellExecute failed with code %d", ret)
	}
	return nil
}
