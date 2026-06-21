package backend

import (
	"context"
	"encoding/json"
	"fmt"

	"tm-template-go-26/backend/bus"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	bus           *bus.Bus
	quitRequested bool
	trayIcon      []byte
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		bus: bus.New(),
	}
	a.registerHandlers()
	return a
}

// SetTrayIcon provides the icon bytes used for the system tray. It is set by
// main.go, which owns the embedded icon assets.
func (a *App) SetTrayIcon(icon []byte) {
	a.trayIcon = icon
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.startTray()
}

// registerHandlers wires the backend command groups exposed over the bus.
func (a *App) registerHandlers() {
	a.bus.Register("app", "exit", func(ctx context.Context, payload json.RawMessage) (any, error) {
		a.RequestExit()
		return nil, nil
	})
	a.bus.Register("app", "show", func(ctx context.Context, payload json.RawMessage) (any, error) {
		runtime.WindowShow(a.ctx)
		return nil, nil
	})
	a.bus.Register("app", "hide", func(ctx context.Context, payload json.RawMessage) (any, error) {
		runtime.WindowHide(a.ctx)
		return nil, nil
	})
}

// Dispatch is the single bound entry point for the grouped command bus.
// The frontend sends a group, a command, and a JSON payload string; the
// JSON-marshaled result is returned as a string.
func (a *App) Dispatch(group string, command string, payloadJSON string) (string, error) {
	var payload json.RawMessage
	if payloadJSON != "" {
		payload = json.RawMessage(payloadJSON)
	}

	result, err := a.bus.Dispatch(a.ctx, group, command, payload)
	if err != nil {
		return "", err
	}

	out, err := json.Marshal(result)
	if err != nil {
		return "", err
	}
	return string(out), nil
}

// RequestExit flags an intentional shutdown and asks Wails to quit. The
// BeforeClose hook then allows the close instead of hiding to the tray.
func (a *App) RequestExit() {
	a.quitRequested = true
	runtime.Quit(a.ctx)
}

// DomReady is called after front-end resources have been loaded
func (a *App) DomReady(ctx context.Context) {
	a.restoreWindowOptions(ctx)
}

// BeforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
//
// This app behaves as a background utility: unless an explicit exit was
// requested (via the frontend menu or the tray), closing the window only hides
// it to the system tray.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	if !a.quitRequested {
		runtime.WindowHide(ctx)
		return true
	}
	a.saveWindowOptions(ctx)
	return false
}

// SetDevToolsState sets DevTools state explicitly and persists it to the ini file.
func (a *App) SetDevToolsState(open bool) {
	a.saveDevToolsState(open)
}

// ToggleDevTools flips DevTools visibility and persists the new state to the ini file.
func (a *App) ToggleDevTools() {
	if a.platformIsDevToolsOpen() {
		a.platformCloseDevTools()
		a.SetDevToolsState(false)
		return
	}

	a.SetDevToolsState(true)
}

func (a *App) saveDevToolsState(open bool) {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.DevTools = open
	saveIniFileOptions(opts)
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
