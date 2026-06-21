package backend

import (
	"github.com/energye/systray"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// startTray launches the system tray icon and menu. systray.Run blocks, so it
// runs in its own goroutine alongside the Wails event loop.
func (a *App) startTray() {
	go systray.Run(a.onTrayReady, a.onTrayExit)
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

	mShow.Click(func() {
		runtime.WindowShow(a.ctx)
	})
	mExit.Click(func() {
		a.RequestExit()
	})

	// Left-click restores the window; right-click opens the tray menu.
	systray.SetOnClick(func(menu systray.IMenu) {
		runtime.WindowShow(a.ctx)
	})
	systray.SetOnRClick(func(menu systray.IMenu) {
		menu.ShowMenu()
	})
}

func (a *App) onTrayExit() {}
