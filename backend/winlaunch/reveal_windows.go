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
	abs, err := resolveExistingPath(path)
	if err != nil {
		return fmt.Errorf("reveal: %w", err)
	}

	// Quote the path inside /select so spaces (e.g. "Program Files") parse
	// correctly. Without quotes, explorer often opens the Documents folder.
	if err := launchExplorer(`/select,"` + abs + `"`); err != nil {
		return fmt.Errorf("reveal: %w", err)
	}
	return nil
}

// OpenInExplorer opens File Explorer navigated into the folder at path.
// If path is a file, opens its parent folder (without selecting the file).
func OpenInExplorer(path string) error {
	abs, err := resolveExistingPath(path)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	info, err := os.Stat(abs)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	target := abs
	if !info.IsDir() {
		target = filepath.Dir(abs)
	}
	if err := launchExplorer(`"` + target + `"`); err != nil {
		return fmt.Errorf("open: %w", err)
	}
	return nil
}

func resolveExistingPath(path string) (string, error) {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return "", fmt.Errorf("empty path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	if _, err := os.Stat(abs); err != nil {
		return "", err
	}
	return abs, nil
}

func launchExplorer(params string) error {
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
			return callErr
		}
		return fmt.Errorf("ShellExecute failed with code %d", ret)
	}
	return nil
}
