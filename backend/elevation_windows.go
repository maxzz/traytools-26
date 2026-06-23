//go:build windows

package backend

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

func IsElevated() bool {
	var token windows.Token
	err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token)
	if err != nil {
		return false
	}
	defer token.Close()

	return token.IsElevated()
}

func RelaunchElevated() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}

	verb, err := windows.UTF16PtrFromString("runas")
	if err != nil {
		return err
	}

	exePtr, err := windows.UTF16PtrFromString(exe)
	if err != nil {
		return err
	}

	ret, _, err := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(exePtr)),
		0,
		0,
		uintptr(windows.SW_SHOWDEFAULT),
	)
	if ret <= 32 {
		if err != nil && err != syscall.Errno(0) {
			return err
		}
		return fmt.Errorf("ShellExecute failed with code %d", ret)
	}

	return nil
}

var (
	shell32         = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW   = shell32.NewProc("ShellExecuteW")
)
