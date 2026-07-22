package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"

	"traytools-26-go/backend/bus"
	"traytools-26-go/backend/dpagent"
	"traytools-26-go/backend/dpunhook"
	copyops "traytools-26-go/backend/tab-1-copyops"
	windowtree "traytools-26-go/backend/tab-2-windowtree"
	tracemanager "traytools-26-go/backend/tab-3-tracemanager"
	toolsmenu "traytools-26-go/backend/tab-4-toolsmenu"
	"traytools-26-go/backend/winapp"
	"traytools-26-go/backend/winhighlight"
	"traytools-26-go/backend/winlaunch"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx           context.Context
	bus           *bus.Bus
	trace         *tracemanager.Manager
	tools         *toolsmenu.Manager
	windows       *windowtree.Manager
	dpagent       *dpagent.Manager
	highlight     *winhighlight.Manager
	copyops       *copyops.Manager
	quitRequested bool
	trayIcon      []byte

	windowMu      sync.Mutex
	windowVisible bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	a := &App{
		bus:       bus.New(),
		trace:     tracemanager.New(),
		tools:     toolsmenu.New(),
		windows:   windowtree.New(),
		dpagent:   dpagent.New(),
		highlight: winhighlight.New(),
		copyops:   copyops.New(),
	}
	a.registerHandlers()
	a.trace.Register(a.bus)
	a.tools.Register(a.bus)
	a.windows.Register(a.bus)
	a.dpagent.Register(a.bus)
	a.highlight.Register(a.bus)
	a.copyops.Register(a.bus)
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
	setupSingleInstanceIPC(a.showWindow)
	a.startHotkeys()
	a.trace.Start(ctx)
	a.copyops.Start(ctx)
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
	a.bus.Register("app", "revealInExplorer", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Path string `json:"path"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return nil, winlaunch.RevealInExplorer(req.Path)
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
	a.bus.Register("settings", "requestUnelevatedRestart", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, RequestUnelevatedRestart()
	})
	a.bus.Register("settings", "isElevated", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return winlaunch.IsElevated(), nil
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
	a.bus.Register("settings", "getUnloadHookHotkey", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return GetUnloadHookHotkeyOptions(), nil
	})
	a.bus.Register("settings", "setUnloadHookHotkey", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req UnloadHookHotkeyOptions
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := SetUnloadHookHotkeyOptions(req.Hotkey, req.Global); err != nil {
			return nil, err
		}
		return nil, nil
	})
	a.bus.Register("app", "sendUnloadHookNotification", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, dpunhook.ForceUnload()
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
//
// Quit runs on a goroutine so a tray-menu Exit click can return to the
// systray message loop immediately. Tray teardown happens in Shutdown —
// never while handling the title-bar WM_CLOSE on the UI thread.
func (a *App) RequestExit() {
	if a.quitRequested {
		return
	}
	a.quitRequested = true
	go func() {
		if a.ctx != nil {
			runtime.Quit(a.ctx)
		}
	}()
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
//
// Do not call stopTray here: BeforeClose runs on the UI thread during WM_CLOSE.
// Blocking on systray teardown freezes the message pump (slow close) and, if the
// wait times out, can leave the systray goroutine alive so the process never
// exits. Tray cleanup belongs in Shutdown.
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	if a.quitRequested || GetQuitOnCloseOption() {
		a.saveWindowOptions(ctx)
		a.quitRequested = true
		return false
	}
	a.hideWindow()
	return true
}

// SetDevToolsState sets DevTools state explicitly and persists it to the ini file.
func (a *App) SetDevToolsState(open bool) {
	a.saveDevToolsState(open)
}

// ToggleDevTools lets Ctrl+Shift+F12 / Ctrl+Shift+I also *close* DevTools.
// WebView2 / Wails only open the inspector via the native accelerator, so when
// it is already open we close the app-owned DevTools window with WM_CLOSE.
// Persisted state is captured authoritatively in saveWindowOptions.
func (a *App) ToggleDevTools() {
	if winapp.IsDevToolsOpen() {
		winapp.CloseDevTools()
	}
}

// SetZoomLevel applies a zoom level (in 1.2^level steps; 0 == 100%) to the
// WebView2 using its native page zoom, and persists it for the next launch.
// This is the runtime counterpart to the windows.ZoomFactor startup option.
func (a *App) SetZoomLevel(level float64) {
	winapp.SetWebviewZoom(a.ctx, math.Pow(1.2, level))
	_ = SetZoomLevelOption(level)
}

// GetZoomLevel returns the persisted zoom level so the frontend can display the
// correct percentage on startup (the factor itself is already applied natively).
func (a *App) GetZoomLevel() float64 {
	return GetZoomLevelOption()
}

func (a *App) saveDevToolsState(open bool) {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.DevTools = open
	saveIniFileOptions(opts)
}

// Shutdown is called at application termination.
func (a *App) Shutdown(ctx context.Context) {
	stopTray()
	a.trace.Shutdown()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}
