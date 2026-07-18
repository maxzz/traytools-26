//go:build !windows

package backend

import "github.com/wailsapp/wails/v2/pkg/options"

// EnsureSingleInstanceOrExit is a no-op on non-Windows platforms. Wails handles
// single-instance locking during startup on Linux and macOS.
func EnsureSingleInstanceOrExit() {}

func setupSingleInstanceIPC(onSecondInstance func()) {}

func acquireInstanceMutex() bool { return true }

func releaseInstanceMutex() {}

// SingleInstanceLock returns Wails options that ensure only one instance runs on
// Linux and macOS.
func (a *App) SingleInstanceLock() *options.SingleInstanceLock {
	return &options.SingleInstanceLock{
		UniqueId: SingleInstanceUniqueID,
		OnSecondInstanceLaunch: func(_ options.SecondInstanceData) {
			a.showWindow()
		},
	}
}
