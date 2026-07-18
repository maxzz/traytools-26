//go:build !windows

package backend

func (a *App) startTray() {}

func stopTray() {}
