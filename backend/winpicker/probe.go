//go:build windows

package winpicker

import (
	"path/filepath"

	"traytools-26-go/backend/winpicker/win32"
)

// Probe identifies the window at a screen point and fills process name plus
// screen/client coordinates. Handle/title are extra fields for reuse.
func Probe(pt win32.Point) Event {
	ev := Event{
		Screen: pt,
		Client: pt,
	}

	hwnd := win32.WindowFromPoint(pt.X, pt.Y)
	if hwnd == 0 {
		return ev
	}

	if client, ok := win32.ScreenToClient(hwnd, pt); ok {
		ev.Client = client
	}

	pid := win32.GetWindowProcessID(hwnd)
	name := win32.GetProcessName(pid)
	if name == "" {
		if path := win32.GetProcessPath(pid); path != "" {
			name = filepath.Base(path)
		}
	}
	ev.ProcessName = name
	ev.Handle = win32.HwndToHexString(hwnd)

	root := win32.GetRootWindow(hwnd)
	if root == 0 {
		root = hwnd
	}
	ev.RootHandle = win32.HwndToHexString(root)
	ev.Title = win32.GetWindowTitle(root)
	if ev.Title == "" {
		ev.Title = win32.GetWindowTitle(hwnd)
	}
	return ev
}

func probeCursor(released bool) Event {
	pt, ok := win32.GetCursorPos()
	if !ok {
		pt = win32.Point{}
	}
	ev := Probe(pt)
	ev.Released = released
	return ev
}
