//go:build windows

package dpunhook

import (
	"fmt"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Win32 BroadcastSystemMessage flags / recipients, matching the C++ traytools
// ots_actions::forceunloadhook / OTSMESSAGE::broadcast_forceunloadhook.
const (
	bsfForceIfHung = 0x00000020
	bsfPostMessage = 0x00000010

	bsmApplications = 0x00000008
	bsmAllDesktops  = 0x00000010
)

var (
	user32                      = windows.NewLazySystemDLL("user32.dll")
	procRegisterWindowMessageW  = user32.NewProc("RegisterWindowMessageW")
	procBroadcastSystemMessageW = user32.NewProc("BroadcastSystemMessageW")
	procEnumWindows             = user32.NewProc("EnumWindows")
	procGetWindowTextW          = user32.NewProc("GetWindowTextW")
)

// ForceUnload broadcasts the DigitalPersona "unhookotshook" registered window
// message so DPAgent / OTS hooks unload. It should typically be run elevated;
// otherwise the broadcast may have no effect across integrity levels.
//
// After the broadcast, top-level windows are enumerated and their titles are
// queried — the legacy traytools code found that broadcast alone was not always
// enough, and touching windows this way completed the unload.
func ForceUnload() error {
	name, err := windows.UTF16PtrFromString("unhookotshook")
	if err != nil {
		return err
	}

	msg, _, callErr := procRegisterWindowMessageW.Call(uintptr(unsafe.Pointer(name)))
	if msg == 0 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("RegisterWindowMessage(unhookotshook): %w", callErr)
		}
		return fmt.Errorf("RegisterWindowMessage(unhookotshook) failed")
	}

	recipients := uint32(bsmAllDesktops | bsmApplications)
	flags := uintptr(bsfForceIfHung | bsfPostMessage)
	lParam := uintptr(windows.GetCurrentProcessId())

	ret, _, callErr := procBroadcastSystemMessageW.Call(
		flags,
		uintptr(unsafe.Pointer(&recipients)),
		msg,
		0,
		lParam,
	)
	// BroadcastSystemMessage returns -1 on failure, 0 if blocked/failed, or a
	// positive count of systems that received the message.
	if int32(ret) < 0 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("BroadcastSystemMessage(unhookotshook): %w", callErr)
		}
		return fmt.Errorf("BroadcastSystemMessage(unhookotshook) failed")
	}

	enumWindowsToForceUnloadHook()
	return nil
}

// enumWindowsToForceUnloadHook mirrors ots_actions::enumwindowstoforceunloadhook:
// walk top-level windows and query each title so message traffic reaches hooks
// that did not respond to the broadcast alone.
func enumWindowsToForceUnloadHook() {
	cb := windows.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		buf := make([]uint16, 512)
		procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
		_ = windows.UTF16ToString(buf)
		return 1 // continue
	})
	procEnumWindows.Call(cb, 0)
}
