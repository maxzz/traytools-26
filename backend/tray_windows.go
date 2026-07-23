//go:build windows

package backend

import (
	"sync"
	"time"
	"unsafe"

	"github.com/energye/systray"
	"golang.org/x/sys/windows"
)

var (
	trayExitCh   chan struct{}
	trayQuitOnce sync.Once

	// Show/Hide menu item; title is refreshed on each right-click.
	trayShowHideItem *systray.MenuItem

	// Cached energye/systray owner HWND (class "SystrayClass") for this process.
	systrayOwnerHWND windows.HWND

	trayUser32        = windows.NewLazySystemDLL("user32.dll")
	procEnumWindows   = trayUser32.NewProc("EnumWindows")
	procGetClassNameW = trayUser32.NewProc("GetClassNameW")
)

// startTray launches the system tray icon and menu. systray.Run blocks, so it
// runs in its own goroutine alongside the Wails event loop.
func (a *App) startTray() {
	trayExitCh = make(chan struct{})
	go systray.Run(a.onTrayReady, onTrayExit)
}

func (a *App) onTrayReady() {
	if len(a.trayIcon) > 0 {
		systray.SetIcon(a.trayIcon)
	}
	systray.SetTitle("Tray Tools")
	systray.SetTooltip("Tray Tools")

	// Window starts visible; label is corrected again just before each popup.
	trayShowHideItem = systray.AddMenuItem("Hide", "Hide the window")
	systray.AddSeparator()
	mExit := systray.AddMenuItem("Exit", "Quit the application")

	// Window show/toggle must not run synchronously inside the systray
	// wndProc (or while TrackPopupMenu is still on the stack). Calling
	// Wails WindowShow there steals foreground mid-menu and breaks later
	// tray clicks — same reason RequestExit dispatches Quit on a goroutine.
	trayShowHideItem.Click(func() {
		go a.toggleWindow()
	})
	mExit.Click(func() {
		a.RequestExit()
	})

	// Left-click toggles the window (hide if open, show if hidden);
	// right-click opens the tray menu.
	systray.SetOnClick(func(menu systray.IMenu) {
		go a.toggleWindow()
	})
	systray.SetOnRClick(func(menu systray.IMenu) {
		a.syncTrayShowHideLabel()
		_ = menu.ShowMenu()
		// energye/systray omits the Microsoft KB 135788 follow-up. Without
		// PostMessage(WM_NULL) after TrackPopupMenu, the next tray menu
		// flash-dismisses or never appears. Do it here so we don't need a
		// forked copy of the library.
		postSystrayMenuTaskSwitch()
	})
}

// syncTrayShowHideLabel sets the tray item to "Hide" or "Show" from the
// current windowVisible flag. Called on the systray thread before the menu
// is shown so Win32 menu APIs stay on the owning thread.
func (a *App) syncTrayShowHideLabel() {
	if trayShowHideItem == nil {
		return
	}
	a.windowMu.Lock()
	visible := a.windowVisible
	a.windowMu.Unlock()
	if visible {
		trayShowHideItem.SetTitle("Hide")
		trayShowHideItem.SetTooltip("Hide the window")
	} else {
		trayShowHideItem.SetTitle("Show")
		trayShowHideItem.SetTooltip("Show the window")
	}
}

func onTrayExit() {
	if trayExitCh != nil {
		close(trayExitCh)
	}
}

// postSystrayMenuTaskSwitch forces a task switch to the systray owner window
// after TrackPopupMenu returns (Microsoft KB 135788 / TrackPopupMenu docs).
func postSystrayMenuTaskSwitch() {
	hwnd := findProcessSystrayWindow()
	if hwnd == 0 {
		return
	}
	const wmNull = 0x0000
	// procPostMessageW is declared in singleinstance_windows.go (same package).
	procPostMessageW.Call(uintptr(hwnd), wmNull, 0, 0)
}

// findProcessSystrayWindow locates energye/systray's hidden owner window
// (class "SystrayClass") in this process.
func findProcessSystrayWindow() windows.HWND {
	if systrayOwnerHWND != 0 {
		return systrayOwnerHWND
	}

	const className = "SystrayClass"
	myPid := windows.GetCurrentProcessId()
	var found windows.HWND

	cb := windows.NewCallback(func(hwnd windows.HWND, _ uintptr) uintptr {
		var pid uint32
		windows.GetWindowThreadProcessId(hwnd, &pid)
		if pid != myPid {
			return 1
		}
		buf := make([]uint16, 256)
		n, _, _ := procGetClassNameW.Call(
			uintptr(hwnd),
			uintptr(unsafe.Pointer(&buf[0])),
			uintptr(len(buf)),
		)
		if n == 0 {
			return 1
		}
		if windows.UTF16ToString(buf[:n]) == className {
			found = hwnd
			return 0
		}
		return 1
	})
	procEnumWindows.Call(cb, 0)
	systrayOwnerHWND = found
	return found
}

// stopTray removes the system tray icon (NIM_DELETE) and waits for the systray
// event loop to finish. Without this, Windows leaves a ghost icon until the
// user hovers over it. Safe to call multiple times and before the tray starts.
//
// Quit is posted once; waiters may call this again (e.g. Shutdown after a
// timed-out earlier attempt) and will observe the already-closed exit channel.
func stopTray() {
	if trayExitCh == nil {
		return
	}
	trayQuitOnce.Do(func() {
		systray.Quit()
	})
	select {
	case <-trayExitCh:
	case <-time.After(2 * time.Second):
	}
}
