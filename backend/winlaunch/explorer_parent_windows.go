//go:build windows

package winlaunch

import (
	"fmt"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

// CreateProcessAsExplorerChild starts exe with Explorer as its parent so the
// child inherits the shell's integrity level (typically medium / non-elevated).
// Use this when the current process is elevated but the child must not be —
// a normal CreateProcess / ShellExecute("open") would inherit High integrity.
//
// args is the remainder of the command line (not including the quoted exe).
// workDir may be empty; CreateProcess then inherits the caller's directory.
func CreateProcessAsExplorerChild(exe, args, workDir string) error {
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
	if strings.TrimSpace(args) != "" {
		cmd += " " + args
	}
	cmdLine, err := windows.UTF16PtrFromString(cmd)
	if err != nil {
		return err
	}

	var dirPtr *uint16
	if workDir != "" {
		dirPtr, err = windows.UTF16PtrFromString(workDir)
		if err != nil {
			return err
		}
	}

	var si windows.StartupInfoEx
	si.Cb = uint32(unsafe.Sizeof(si))
	si.ProcThreadAttributeList = attrList.List()
	si.StartupInfo.Flags = windows.STARTF_USESHOWWINDOW
	// Do not use SW_SHOWDEFAULT: it can inherit a shortcut's minimized/maximized
	// Run state into the child process.
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
