package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"traytools-26-go/backend/bus"
	"traytools-26-go/backend/toolsmenu"
	"traytools-26-go/backend/tracemanager"
	"traytools-26-go/backend/windowtree"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	bus           *bus.Bus
	trace         *tracemanager.Manager
	tools         *toolsmenu.Manager
	windows       *windowtree.Manager
	quitRequested bool
	trayIcon      []byte

	windowMu      sync.Mutex
	windowVisible bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		bus:     bus.New(),
		trace:   tracemanager.New(),
		tools:   toolsmenu.New(),
		windows: windowtree.New(),
	}
	a.registerHandlers()
	a.trace.Register(a.bus)
	a.tools.Register(a.bus)
	a.windows.Register(a.bus)
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
	a.trace.Start(ctx)
	a.startTray()
}

// registerHandlers wires the backend command groups exposed over the bus.
func (a *App) registerHandlers() {
	a.bus.Register("app", "exit", func(ctx context.Context, payload json.RawMessage) (any, error) {
		a.RequestExit()
		return nil, nil
	})
	a.bus.Register("app", "show", func(ctx context.Context, payload json.RawMessage) (any, error) {
		a.showWindow()
		return nil, nil
	})
	a.bus.Register("app", "hide", func(ctx context.Context, payload json.RawMessage) (any, error) {
		a.hideWindow()
		return nil, nil
	})
	a.bus.Register("app", "toggle", func(ctx context.Context, payload json.RawMessage) (any, error) {
		a.toggleWindow()
		return nil, nil
	})
	a.bus.Register("settings", "getRunElevated", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return GetRunElevatedOption(), nil
	})
	a.bus.Register("settings", "setRunElevated", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Value bool `json:"value"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := SetRunElevatedOption(req.Value); err != nil {
			return nil, err
		}
		return nil, nil
	})
	a.bus.Register("settings", "requestElevationRestart", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, RequestElevationRestart()
	})
	a.bus.Register("settings", "isElevated", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return IsElevated(), nil
	})
	a.bus.Register("settings", "getQuitOnClose", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return GetQuitOnCloseOption(), nil
	})
	a.bus.Register("settings", "setQuitOnClose", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Value bool `json:"value"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := SetQuitOnCloseOption(req.Value); err != nil {
			return nil, err
		}
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
// This app behaves as a background utility by default: unless an explicit exit
// was requested (via the frontend menu or the tray), or quitOnClose is enabled
// in settings, closing the window only hides it to the system tray.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	if a.quitRequested || GetQuitOnCloseOption() {
		a.saveWindowOptions(ctx)
		return false
	}
	a.hideWindow()
	return true
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
func (a *App) shutdown( /*ctx context.Context*/ ) {
	a.trace.Shutdown()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
