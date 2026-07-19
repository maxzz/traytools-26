package backend

import "github.com/wailsapp/wails/v2/pkg/runtime"

// Wails v2 has no "is the window visible" query, so we track visibility
// ourselves. All show/hide paths must go through these helpers to keep the
// flag accurate. The mutex guards against concurrent access from the tray
// goroutine and the command bus.

func (a *App) showWindow() {
	a.windowMu.Lock()
	defer a.windowMu.Unlock()
	a.showWindowLocked()
}

func (a *App) hideWindow() {
	a.windowMu.Lock()
	defer a.windowMu.Unlock()
	a.hideWindowLocked()
}

// toggleWindow hides the window if it is currently shown, otherwise shows it.
func (a *App) toggleWindow() {
	a.windowMu.Lock()
	defer a.windowMu.Unlock()
	if a.windowVisible {
		a.hideWindowLocked()
	} else {
		a.showWindowLocked()
	}
}

func (a *App) showWindowLocked() {
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
	a.windowVisible = true
}

func (a *App) hideWindowLocked() {
	// Persist geometry before hide; GetPosition/GetWindowRect after hide can
	// be wrong, and tray Exit would otherwise overwrite a good saved position.
	if a.ctx != nil && a.windowVisible {
		a.saveWindowOptions(a.ctx)
	}
	runtime.WindowHide(a.ctx)
	a.windowVisible = false
}
