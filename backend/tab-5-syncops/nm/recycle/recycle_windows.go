//go:build windows

package recycle

import (
	"errors"
	"fmt"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	foDelete          = 0x0003
	fofAllowUndo      = 0x0040
	fofNoConfirmation = 0x0010
	fofSilent         = 0x0004
	fofNoErrorUI      = 0x0400
)

type shFileOpStructW struct {
	hwnd                  uintptr
	wFunc                 uint32
	pFrom                 uintptr
	pTo                   uintptr
	fFlags                uint16
	fAnyOperationsAborted int32
	hNameMappings         uintptr
	lpszProgressTitle     uintptr
}

var shFileOperationW = windows.NewLazySystemDLL("shell32.dll").NewProc("SHFileOperationW")

// MoveToRecycleBin sends a file or directory to the Windows Recycle Bin.
func MoveToRecycleBin(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("recycle bin: resolve path: %w", err)
	}

	utf16Path, err := windows.UTF16FromString(absPath)
	if err != nil {
		return fmt.Errorf("recycle bin: encode path: %w", err)
	}
	utf16Path = append(utf16Path, 0)

	op := shFileOpStructW{
		wFunc:  foDelete,
		pFrom:  uintptr(unsafe.Pointer(&utf16Path[0])),
		fFlags: fofAllowUndo | fofNoConfirmation | fofSilent | fofNoErrorUI,
	}

	ret, _, callErr := shFileOperationW.Call(uintptr(unsafe.Pointer(&op)))
	if ret != 0 {
		if callErr != nil && !errors.Is(callErr, windows.ERROR_SUCCESS) {
			return fmt.Errorf("recycle bin: SHFileOperationW failed (code %d): %w", ret, callErr)
		}
		return fmt.Errorf("recycle bin: SHFileOperationW failed with code %d", ret)
	}
	return nil
}
