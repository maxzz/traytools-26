package backend

import "github.com/wailsapp/wails/v2/pkg/runtime"

// Wails v2 has no "is the window visible" query, so we track tray hide/show
// ourselves. All show/hide paths must go through these helpers to keep the
// flag accurate. The mutex guards against concurrent access from the tray
// goroutine and the command bus.
//
// Taskbar minimize does not go through hideWindow, so windowVisible can stay
// true while the window is minimized. windowIsShownLocked accounts for that.

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
	if a.windowIsShownLocked() {
		a.hideWindowLocked()
	} else {
		a.showWindowLocked()
	}
}

// windowIsShownLocked reports whether the main window is on-screen (not
// tray-hidden and not taskbar-minimized). Callers must hold windowMu.
func (a *App) windowIsShownLocked() bool {
	if !a.windowVisible {
		return false
	}
	if a.ctx != nil && runtime.WindowIsMinimised(a.ctx) {
		return false
	}
	return true
}

func (a *App) showWindowLocked() {
	runtime.WindowUnminimise(a.ctx)
	runtime.WindowShow(a.ctx)
	a.windowVisible = true
}

func (a *App) hideWindowLocked() {
	runtime.WindowHide(a.ctx)
	a.windowVisible = false
}
