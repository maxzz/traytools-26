package main

import (
	"embed"
	"math"
	"os"
	"runtime"
	"traytools-26-go/backend"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

//go:embed build/windows/icon.ico
var iconWindows []byte

// trayIcon returns the icon bytes best suited for the current platform's tray.
func trayIcon() []byte {
	if runtime.GOOS == "windows" {
		return iconWindows
	}
	return icon
}

func main() {
	backend.EnsureSingleInstanceOrExit()
	backend.EnsureElevatedIfRequested()

	// Create an instance of the app structure
	app := backend.NewApp()
	app.SetTrayIcon(trayIcon())

	// Load options on startup to get initial width/height
	initialWidth := 1200
	initialHeight := 800

	opts, err := backend.LoadIniFileOptions()
	if err == nil && opts != nil && opts.Bounds != nil {
		bounds := backend.FixBounds(opts.Bounds)
		if bounds != nil {
			initialWidth = bounds.Width
			initialHeight = bounds.Height
		}
	}

	// Create application with options
	openInspector := false
	zoomFactor := 1.0
	if err == nil && opts != nil {
		openInspector = opts.DevTools
		if opts.ZoomLevel != 0 {
			zoomFactor = math.Pow(1.2, opts.ZoomLevel)
		}
	}

	winOpts := &windows.Options{
		// Native page zoom (Chrome-style), applied by the WebView2 engine.
		// User wheel/keyboard zoom is disabled so the in-app zoom controls
		// remain the single source of truth for the displayed percentage;
		// the buttons drive it at runtime via App.SetZoomLevel.
		IsZoomControlEnabled: false,
		ZoomFactor:           zoomFactor,
	}

	err = wails.Run(&options.App{
		Title:              "traytools",
		Width:              initialWidth,
		Height:             initialHeight,
		Assets:             assets,
		BackgroundColour:   &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:          app.Startup,
		OnDomReady:         app.DomReady,
		OnBeforeClose:      app.BeforeClose,
		OnShutdown:         app.Shutdown,
		StartHidden:        true,
		SingleInstanceLock: app.SingleInstanceLock(),
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: false,
		},
		Debug: options.Debug{
			OpenInspectorOnStartup: openInspector,
		},
		Windows: winOpts,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
	// Force process exit so a stuck systray goroutine cannot keep the process
	// alive after the main window has already shut down.
	os.Exit(0)
}
