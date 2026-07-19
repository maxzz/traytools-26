//go:build windows

package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

	return createProcessWithExplorerParent(exe, exeDir)
}

func createProcessWithExplorerParent(exe, exeDir string) error {
	shellHWND := windows.GetShellWindow()
	if shellHWND == 0 {
		return fmt.Errorf("GetShellWindow returned 0 (is Explorer running?)")
	}

	var pid uint32
	if _, err := windows.GetWindowThreadProcessId(shellHWND, &pid); err != nil {
		return fmt.Errorf("GetWindowThreadProcessId: %w", err)
	}
	if pid == 0 {
		return fmt.Errorf("shell window has no process id")
	}

	parent, err := windows.OpenProcess(windows.PROCESS_CREATE_PROCESS, false, pid)
	if err != nil {
		return fmt.Errorf("OpenProcess(explorer): %w", err)
	}
	defer windows.CloseHandle(parent)

	attrList, err := windows.NewProcThreadAttributeList(1)
	if err != nil {
		return err
	}
	defer attrList.Delete()

	// Update stores the pointer; parent must remain live until CreateProcess returns.
	if err := attrList.Update(
		windows.PROC_THREAD_ATTRIBUTE_PARENT_PROCESS,
		unsafe.Pointer(&parent),
		unsafe.Sizeof(parent),
	); err != nil {
		return fmt.Errorf("UpdateProcThreadAttribute: %w", err)
	}

	cmd := `"` + exe + `"`
	if len(os.Args) > 1 {
		cmd += " " + strings.Join(os.Args[1:], " ")
	}
	cmdLine, err := windows.UTF16PtrFromString(cmd)
	if err != nil {
		return err
	}
	dirPtr, err := windows.UTF16PtrFromString(exeDir)
	if err != nil {
		return err
	}

	var si windows.StartupInfoEx
	si.Cb = uint32(unsafe.Sizeof(si))
	si.ProcThreadAttributeList = attrList.List()
	si.StartupInfo.Flags = windows.STARTF_USESHOWWINDOW
	// Do not use SW_SHOWDEFAULT: it can inherit a shortcut's minimized/maximized
	// Run state into the relaunched process.
	si.StartupInfo.ShowWindow = uint16(windows.SW_SHOWNORMAL)

	var pi windows.ProcessInformation
	if err := windows.CreateProcess(
		nil,
		cmdLine,
		nil,
		nil,
		false,
		windows.CREATE_UNICODE_ENVIRONMENT|windows.EXTENDED_STARTUPINFO_PRESENT,
		nil,
		dirPtr,
		&si.StartupInfo,
		&pi,
	); err != nil {
		return fmt.Errorf("CreateProcess (explorer parent): %w", err)
	}
	windows.CloseHandle(pi.Thread)
	windows.CloseHandle(pi.Process)
	return nil
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
