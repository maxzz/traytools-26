//go:build windows

package backend

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	boundsUser32 = windows.NewLazySystemDLL("user32.dll")

	procEnumWindowsBounds   = boundsUser32.NewProc("EnumWindows")
	procGetWindowThreadPID  = boundsUser32.NewProc("GetWindowThreadProcessId")
	procGetWindowRectBounds = boundsUser32.NewProc("GetWindowRect")
	procSetWindowPosBounds  = boundsUser32.NewProc("SetWindowPos")
	procGetWindowBoundsGW   = boundsUser32.NewProc("GetWindow")
	procGetWindowLongPtrBnd = boundsUser32.NewProc("GetWindowLongPtrW")
)

const (
	gwOwnerBounds = 4

	gwlExStyleBounds = ^uintptr(19) // -20
	wsExToolWindow   = 0x00000080
	wsExAppWindow    = 0x00040000

	swpNosize     = 0x0001
	swpNoZOrder   = 0x0004
	swpNoActivate = 0x0010
)

type boundsRect struct {
	Left, Top, Right, Bottom int32
}

// platformReadWindowPosition returns the main window's top-left in
// virtual-screen (physical) coordinates. Size is intentionally not taken from
// GetWindowRect: those are physical pixels, while Wails Width/Height are
// logical DIP — mixing them makes the window grow on every restart under DPI scaling.
func platformReadWindowPosition() (x, y int, ok bool) {
	hwnd := findAppMainHWND()
	if hwnd == 0 {
		return 0, 0, false
	}
	var r boundsRect
	ret, _, _ := procGetWindowRectBounds.Call(hwnd, uintptr(unsafe.Pointer(&r)))
	if ret == 0 {
		return 0, 0, false
	}
	return int(r.Left), int(r.Top), true
}

// platformApplyWindowPosition moves the main window without changing its size.
func platformApplyWindowPosition(x, y int) bool {
	hwnd := findAppMainHWND()
	if hwnd == 0 {
		return false
	}
	ret, _, _ := procSetWindowPosBounds.Call(
		hwnd,
		0,
		uintptr(x),
		uintptr(y),
		0,
		0,
		uintptr(swpNosize|swpNoZOrder|swpNoActivate),
	)
	return ret != 0
}

// findAppMainHWND picks the largest top-level window owned by this process
// (title changes with the active tab, so we cannot rely on FindWindow by name).
func findAppMainHWND() uintptr {
	pid := windows.GetCurrentProcessId()
	var bestHWND uintptr
	var bestArea int32

	cb := windows.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		var wpid uint32
		procGetWindowThreadPID.Call(hwnd, uintptr(unsafe.Pointer(&wpid)))
		if wpid != pid {
			return 1
		}

		owner, _, _ := procGetWindowBoundsGW.Call(hwnd, uintptr(gwOwnerBounds))
		if owner != 0 {
			return 1
		}

		exStyle, _, _ := procGetWindowLongPtrBnd.Call(hwnd, gwlExStyleBounds)
		if exStyle&wsExToolWindow != 0 && exStyle&wsExAppWindow == 0 {
			return 1
		}

		var r boundsRect
		ok, _, _ := procGetWindowRectBounds.Call(hwnd, uintptr(unsafe.Pointer(&r)))
		if ok == 0 {
			return 1
		}
		w := r.Right - r.Left
		h := r.Bottom - r.Top
		if w < 100 || h < 100 {
			return 1
		}
		area := w * h
		if area > bestArea {
			bestArea = area
			bestHWND = hwnd
		}
		return 1
	})
	procEnumWindowsBounds.Call(cb, 0)
	return bestHWND
}
