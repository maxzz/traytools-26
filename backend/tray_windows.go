//go:build windows

package backend

import (
	"sync"
	"time"

	"github.com/energye/systray"
)

var (
	trayExitCh   chan struct{}
	trayQuitOnce sync.Once
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

	mShow := systray.AddMenuItem("Show", "Show the window")
	systray.AddSeparator()
	mExit := systray.AddMenuItem("Exit", "Quit the application")

	// Window show/toggle must not run synchronously inside the systray
	// wndProc (or while TrackPopupMenu is still on the stack). Calling
	// Wails WindowShow there steals foreground mid-menu and breaks later
	// tray clicks — same reason RequestExit dispatches Quit on a goroutine.
	mShow.Click(func() {
		go a.showWindow()
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
		menu.ShowMenu()
	})
}

func onTrayExit() {
	if trayExitCh != nil {
		close(trayExitCh)
	}
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
