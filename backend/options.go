package backend

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Rectangle struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

type IniOptions struct {
	Bounds                 *Rectangle `json:"bounds,omitempty"`
	DevTools               bool       `json:"devTools"`
	ShowMenu               bool       `json:"showMenu"`
	RunElevated            bool       `json:"runElevated"`
	QuitOnClose            bool       `json:"quitOnClose"`
	UnloadHookHotkey       string     `json:"unloadHookHotkey,omitempty"`
	UnloadHookHotkeyGlobal bool       `json:"unloadHookHotkeyGlobal,omitempty"`
}

func getIniFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(configDir, "traytools-26-go")
	// Make sure the directory exists
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "init.json"), nil
}

func LoadIniFileOptions() (*IniOptions, error) {
	filePath, err := getIniFilePath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var opts IniOptions
	if err := json.Unmarshal(data, &opts); err != nil {
		return nil, err
	}
	return &opts, nil
}

func saveIniFileOptions(opts *IniOptions) error {
	filePath, err := getIniFilePath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(opts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

func FixBounds(bounds *Rectangle) *Rectangle {
	if bounds == nil {
		return nil
	}
	// Sanity check: width and height must be positive and reasonable
	if bounds.Width < 100 || bounds.Height < 100 {
		return nil
	}
	// Virtual screen coords on modern multi-monitor setups rarely exceed +/- 16000.
	if bounds.X < -16000 || bounds.X > 16000 || bounds.Y < -16000 || bounds.Y > 16000 {
		return nil
	}
	return bounds
}

func (a *App) saveWindowOptions(ctx context.Context) {
	existing, err := LoadIniFileOptions()
	if err != nil {
		existing = &IniOptions{}
	}

	// Position: absolute virtual-screen coords (Win32) so multi-monitor works.
	// Size: Wails logical DIP via WindowGetSize — must not use GetWindowRect
	// width/height (physical pixels) or the window grows under DPI scaling.
	var bounds *Rectangle
	if runtime.WindowIsMaximised(ctx) {
		bounds = existing.Bounds
	} else {
		w, h := runtime.WindowGetSize(ctx)
		x, y := runtime.WindowGetPosition(ctx)
		if px, py, ok := platformReadWindowPosition(); ok {
			x, y = px, py
		}
		bounds = FixBounds(&Rectangle{X: x, Y: y, Width: w, Height: h})
		if bounds == nil {
			bounds = existing.Bounds
		}
	}

	opts := &IniOptions{
		Bounds:                 bounds,
		DevTools:               a.platformIsDevToolsOpen(),
		ShowMenu:               existing.ShowMenu,
		RunElevated:            existing.RunElevated,
		QuitOnClose:            existing.QuitOnClose,
		UnloadHookHotkey:       existing.UnloadHookHotkey,
		UnloadHookHotkeyGlobal: existing.UnloadHookHotkeyGlobal,
	}

	_ = saveIniFileOptions(opts)
}

func GetQuitOnCloseOption() bool {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		return false
	}
	return opts.QuitOnClose
}

func SetQuitOnCloseOption(value bool) error {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.QuitOnClose = value
	return saveIniFileOptions(opts)
}

// UnloadHookHotkeyOptions is the persisted binding for View → Send unload hook notification.
type UnloadHookHotkeyOptions struct {
	Hotkey string `json:"hotkey"`
	Global bool   `json:"global"`
}

func GetUnloadHookHotkeyOptions() UnloadHookHotkeyOptions {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		return UnloadHookHotkeyOptions{}
	}
	return UnloadHookHotkeyOptions{
		Hotkey: opts.UnloadHookHotkey,
		Global: opts.UnloadHookHotkeyGlobal,
	}
}

func SetUnloadHookHotkeyOptions(hotkey string, global bool) error {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.UnloadHookHotkey = hotkey
	opts.UnloadHookHotkeyGlobal = global
	if err := saveIniFileOptions(opts); err != nil {
		return err
	}
	return applyUnloadHookHotkey(hotkey, global)
}

func (a *App) restoreWindowOptions(ctx context.Context) {
	opts, err := LoadIniFileOptions()
	if err == nil && opts != nil {
		if bounds := FixBounds(opts.Bounds); bounds != nil {
			// Size via Wails (logical DIP); position via Win32 absolute coords.
			runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
			if !platformApplyWindowPosition(bounds.X, bounds.Y) {
				runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
			}
		}
	}

	// Show after positioning (app starts hidden).
	runtime.WindowShow(ctx)

	a.windowMu.Lock()
	a.windowVisible = true
	a.windowMu.Unlock()
}
