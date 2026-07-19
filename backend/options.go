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
	// 1. Get current window state
	isMaximized := runtime.WindowIsMaximised(ctx)
	isMinimized := runtime.WindowIsMinimised(ctx)

	var bounds *Rectangle
	if !isMaximized && !isMinimized {
		x, y := runtime.WindowGetPosition(ctx)
		w, h := runtime.WindowGetSize(ctx)
		bounds = &Rectangle{
			X:      x,
			Y:      y,
			Width:  w,
			Height: h,
		}
	} else {
		// Maximized/minimized geometry is not the normal restore rect; keep prior bounds.
		existing, err := LoadIniFileOptions()
		if err == nil && existing != nil && existing.Bounds != nil {
			bounds = existing.Bounds
		}
	}

	// 2. DevTools & ShowMenu state
	devTools := a.platformIsDevToolsOpen()
	var showMenu bool
	var runElevated bool
	var quitOnClose bool
	var unloadHookHotkey string
	var unloadHookHotkeyGlobal bool

	existing, err := LoadIniFileOptions()
	if err == nil && existing != nil {
		showMenu = existing.ShowMenu
		runElevated = existing.RunElevated
		quitOnClose = existing.QuitOnClose
		unloadHookHotkey = existing.UnloadHookHotkey
		unloadHookHotkeyGlobal = existing.UnloadHookHotkeyGlobal
	}

	opts := &IniOptions{
		Bounds:                 bounds,
		DevTools:               devTools,
		ShowMenu:               showMenu,
		RunElevated:            runElevated,
		QuitOnClose:            quitOnClose,
		UnloadHookHotkey:       unloadHookHotkey,
		UnloadHookHotkeyGlobal: unloadHookHotkeyGlobal,
	}

	saveIniFileOptions(opts)
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
	var bounds *Rectangle
	opts, err := LoadIniFileOptions()
	if err == nil && opts != nil && opts.Bounds != nil {
		bounds = FixBounds(opts.Bounds)
	}

	// On Windows, the first ShowWindow for a process can ignore the requested
	// show command and use STARTUPINFO.wShowWindow from the launcher instead.
	// Shortcuts often pass SW_SHOWMINIMIZED / SW_SHOWMAXIMIZED / SW_SHOWDEFAULT,
	// while a direct .exe launch usually passes SW_SHOWNORMAL — which is why
	// restore looked correct only when not started from a shortcut.
	//
	// Force a normal visible window, then re-apply saved bounds (placement is
	// unreliable while the window is still minimized).
	runtime.WindowShow(ctx)
	runtime.WindowUnminimise(ctx)
	if runtime.WindowIsMaximised(ctx) {
		runtime.WindowUnmaximise(ctx)
	}
	if bounds != nil {
		runtime.WindowSetPosition(ctx, bounds.X, bounds.Y)
		runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
	}

	a.windowMu.Lock()
	a.windowVisible = true
	a.windowMu.Unlock()
}
