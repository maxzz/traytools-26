package backend

import "github.com/wailsapp/wails/v2/pkg/options"

// SingleInstanceUniqueID identifies this app for Wails single-instance locking.
const SingleInstanceUniqueID = "e8f4a2c1-6d3b-4f7e-9a0c-traytools26"

func singleInstanceEnabled() bool {
	return !isDevExecutable()
}

// SingleInstanceLock returns Wails options that ensure only one instance runs.
// When a second instance is launched, the existing window is shown and focused.
func (a *App) SingleInstanceLock() *options.SingleInstanceLock {
	if !singleInstanceEnabled() {
		return nil
	}

	return &options.SingleInstanceLock{
		UniqueId: SingleInstanceUniqueID,
		OnSecondInstanceLaunch: func(_ options.SecondInstanceData) {
			a.showWindow()
		},
	}
}
