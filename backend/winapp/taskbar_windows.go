//go:build windows

package winapp

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	gwlExStyle = ^uintptr(19) // -20

	wsExAppWindow  = 0x00040000
	wsExToolWindow = 0x00000080

	swHide           = 0
	swShowMinNoActive = 7
	swShowNA         = 8

	swpNosize       = 0x0001
	swpNomove       = 0x0002
	swpNozorder     = 0x0004
	swpNoactivate   = 0x0010
	swpFramechanged = 0x0020

	// Default Wails v2 window class (see wails WindowClassName option).
	wailsWindowClass = "wailsWindow"
)

var (
	taskbarUser32             = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW           = taskbarUser32.NewProc("FindWindowW")
	procGetWindowLongPtrW     = taskbarUser32.NewProc("GetWindowLongPtrW")
	procSetWindowLongPtrW     = taskbarUser32.NewProc("SetWindowLongPtrW")
	procShowWindow            = taskbarUser32.NewProc("ShowWindow")
	procIsWindowVisible       = taskbarUser32.NewProc("IsWindowVisible")
	procIsIconic              = taskbarUser32.NewProc("IsIconic")
	procSetWindowPos          = taskbarUser32.NewProc("SetWindowPos")
)

// SetShowInTaskbar shows or hides the main Wails window button on the
// Windows taskbar by toggling WS_EX_APPWINDOW / WS_EX_TOOLWINDOW.
func SetShowInTaskbar(show bool) {
	hwnd := findWailsMainWindow()
	if hwnd == 0 {
		return
	}

	ex, _, _ := procGetWindowLongPtrW.Call(hwnd, gwlExStyle)
	want := ex
	if show {
		want = (ex | wsExAppWindow) &^ wsExToolWindow
	} else {
		want = (ex | wsExToolWindow) &^ wsExAppWindow
	}
	if want == ex {
		return
	}

	visible := isTruthy(procIsWindowVisible.Call(hwnd))
	iconic := isTruthy(procIsIconic.Call(hwnd))

	// Taskbar membership is cached; the style change takes effect only if the
	// window is hidden first (see "Managing Taskbar Buttons").
	if visible {
		procShowWindow.Call(hwnd, swHide)
	}
	procSetWindowLongPtrW.Call(hwnd, gwlExStyle, want)
	procSetWindowPos.Call(
		hwnd, 0, 0, 0, 0, 0,
		swpNomove|swpNosize|swpNozorder|swpNoactivate|swpFramechanged,
	)
	if visible {
		if iconic {
			procShowWindow.Call(hwnd, swShowMinNoActive)
		} else {
			procShowWindow.Call(hwnd, swShowNA)
		}
	}
}

func findWailsMainWindow() uintptr {
	className, err := windows.UTF16PtrFromString(wailsWindowClass)
	if err != nil {
		return 0
	}
	hwnd, _, _ := procFindWindowW.Call(uintptr(unsafe.Pointer(className)), 0)
	return hwnd
}

func isTruthy(r uintptr, _ uintptr, _ error) bool {
	return r != 0
}
