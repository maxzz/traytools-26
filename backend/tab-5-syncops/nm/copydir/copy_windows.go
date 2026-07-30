//go:build windows

package copydir

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	fileFlagBackupSemantics = 0x02000000
	fileShareRead           = 0x00000001
	fileShareWrite          = 0x00000002
	fileShareDelete         = 0x00000004
	openExisting            = 3
	genericRead             = 0x80000000
	fileWriteAttributes     = 0x00000100
)

var (
	kernel32         = windows.NewLazySystemDLL("kernel32.dll")
	procCreateFileW  = kernel32.NewProc("CreateFileW")
	procGetFileTime  = kernel32.NewProc("GetFileTime")
	procSetFileTime  = kernel32.NewProc("SetFileTime")
	procGetFileAttributesW = kernel32.NewProc("GetFileAttributesW")
	procSetFileAttributesW = kernel32.NewProc("SetFileAttributesW")
)

type fileTime struct {
	LowDateTime  uint32
	HighDateTime uint32
}

func copyFileMetadata(src, dst string) error {
	srcHandle, err := openPath(src, genericRead, fileShareRead|fileShareWrite|fileShareDelete)
	if err != nil {
		return fmt.Errorf("open source metadata: %w", err)
	}
	defer windows.CloseHandle(srcHandle)

	dstHandle, err := openPath(dst, fileWriteAttributes, fileShareRead|fileShareWrite|fileShareDelete)
	if err != nil {
		return fmt.Errorf("open destination metadata: %w", err)
	}
	defer windows.CloseHandle(dstHandle)

	var creation, access, write fileTime
	r1, _, e1 := procGetFileTime.Call(uintptr(srcHandle), uintptr(unsafe.Pointer(&creation)), uintptr(unsafe.Pointer(&access)), uintptr(unsafe.Pointer(&write)))
	if r1 == 0 {
		return fmt.Errorf("GetFileTime source: %w", e1)
	}

	r1, _, e1 = procSetFileTime.Call(uintptr(dstHandle), uintptr(unsafe.Pointer(&creation)), uintptr(unsafe.Pointer(&access)), uintptr(unsafe.Pointer(&write)))
	if r1 == 0 {
		return fmt.Errorf("SetFileTime destination: %w", e1)
	}

	attrs, _, e1 := procGetFileAttributesW.Call(uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(src))))
	if attrs == uintptr(invalidFileAttributes) {
		return fmt.Errorf("GetFileAttributes source: %w", e1)
	}

	r1, _, e1 = procSetFileAttributesW.Call(uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(dst))), attrs)
	if r1 == 0 {
		return fmt.Errorf("SetFileAttributes destination: %w", e1)
	}

	return nil
}

const invalidFileAttributes = ^uint32(0)

func openPath(path string, access, share uint32) (windows.Handle, error) {
	pathPtr, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return 0, err
	}

	handle, _, err := procCreateFileW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		uintptr(access),
		uintptr(share),
		0,
		uintptr(openExisting),
		uintptr(fileFlagBackupSemantics),
		0,
	)
	if handle == invalidHandle {
		return 0, err
	}
	return windows.Handle(handle), nil
}

const invalidHandle = ^uintptr(0)

func copyFileContent(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	info, err := srcFile.Stat()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	dstFile, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return err
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return err
	}

	return dstFile.Sync()
}

func copyPlatformFile(src, dst string) error {
	if err := copyFileContent(src, dst); err != nil {
		return err
	}
	return copyFileMetadata(src, dst)
}
