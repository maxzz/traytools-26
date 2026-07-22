//go:build windows

package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"traytools-26-go/backend/winlaunch"

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
	return shellExecuteSelf("runas")
}

// RelaunchUnelevated starts a new instance at medium integrity and returns.
// When elevated, the child is created with Explorer as its parent so it
// inherits the shell's (typically non-elevated) integrity level. Callers
// should exit after success.
func RelaunchUnelevated() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exeDir := filepath.Dir(exe)

	if !IsElevated() {
		return shellExecuteSelf("open")
	}

	args := ""
	if len(os.Args) > 1 {
		args = strings.Join(os.Args[1:], " ")
	}
	return winlaunch.CreateProcessAsExplorerChild(exe, args, exeDir)
}

func shellExecuteSelf(verbStr string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}

	exeDir := filepath.Dir(exe)

	verb, err := windows.UTF16PtrFromString(verbStr)
	if err != nil {
		return err
	}

	exePtr, err := windows.UTF16PtrFromString(exe)
	if err != nil {
		return err
	}

	dirPtr, err := windows.UTF16PtrFromString(exeDir)
	if err != nil {
		return err
	}

	var paramsArg uintptr
	if len(os.Args) > 1 {
		params, err := windows.UTF16PtrFromString(strings.Join(os.Args[1:], " "))
		if err != nil {
			return err
		}
		paramsArg = uintptr(unsafe.Pointer(params))
	}

	ret, _, err := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(exePtr)),
		paramsArg,
		uintptr(unsafe.Pointer(dirPtr)),
		uintptr(windows.SW_SHOWNORMAL),
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
	shell32       = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW = shell32.NewProc("ShellExecuteW")
)
