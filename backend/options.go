package backend

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"traytools-26-go/backend/winapp"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Named window-size presets. Additional keys can be added later (e.g. per-tab layouts).
const (
	WindowSizeNormal = "normal"
	WindowSizeMini   = "mini"
)

type Rectangle struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

type IniOptions struct {
	// Bounds is the legacy single geometry field. Migrated into WindowSizes[normal]
	// on load; still written as a mirror of the active size for older readers.
	Bounds *Rectangle `json:"bounds,omitempty"`
	// WindowSizeKey is the active named size ("normal", "mini", …).
	WindowSizeKey string `json:"windowSizeKey,omitempty"`
	// WindowSizes stores a geometry per named size key.
	WindowSizes map[string]*Rectangle `json:"windowSizes,omitempty"`

	DevTools               bool    `json:"devTools"`
	ShowMenu               bool    `json:"showMenu"`
	RunElevated            bool    `json:"runElevated"`
	QuitOnClose            bool    `json:"quitOnClose"`
	UnloadHookHotkey       string  `json:"unloadHookHotkey,omitempty"`
	UnloadHookHotkeyGlobal bool    `json:"unloadHookHotkeyGlobal,omitempty"`
	// ZoomLevel is an Electron-style zoom level: factor = 1.2^level (0 == 100%).
	ZoomLevel float64 `json:"zoomLevel,omitempty"`
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
	migrateWindowSizes(&opts)
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
	// Mini mode can be a short toolbar strip; allow small but positive sizes.
	if bounds.Width < 40 || bounds.Height < 40 {
		return nil
	}
	// Virtual screen coords on modern multi-monitor setups rarely exceed +/- 16000.
	if bounds.X < -16000 || bounds.X > 16000 || bounds.Y < -16000 || bounds.Y > 16000 {
		return nil
	}
	return bounds
}

func defaultWindowSize(key string) *Rectangle {
	switch key {
	case WindowSizeMini:
		// Header/menubar strip — user can reposition/resize; persisted thereafter.
		return &Rectangle{X: 100, Y: 100, Width: 480, Height: 72}
	default:
		return &Rectangle{X: 100, Y: 100, Width: 1200, Height: 800}
	}
}

// migrateWindowSizes lifts legacy Bounds into WindowSizes["normal"] and
// normalizes the active key. Idempotent.
func migrateWindowSizes(opts *IniOptions) {
	if opts == nil {
		return
	}
	if opts.WindowSizes == nil {
		opts.WindowSizes = map[string]*Rectangle{}
	}
	if FixBounds(opts.WindowSizes[WindowSizeNormal]) == nil {
		if b := FixBounds(opts.Bounds); b != nil {
			opts.WindowSizes[WindowSizeNormal] = &Rectangle{
				X: b.X, Y: b.Y, Width: b.Width, Height: b.Height,
			}
		}
	}
	if opts.WindowSizeKey == "" {
		opts.WindowSizeKey = WindowSizeNormal
	}
}

func normalizeWindowSizeKey(key string) string {
	if key == "" {
		return WindowSizeNormal
	}
	return key
}

// ActiveWindowBounds returns the geometry for the active (or given) size key,
// falling back to defaults when nothing valid is stored.
func ActiveWindowBounds(opts *IniOptions, key string) *Rectangle {
	if opts == nil {
		return defaultWindowSize(normalizeWindowSizeKey(key))
	}
	migrateWindowSizes(opts)
	key = normalizeWindowSizeKey(key)
	if b := FixBounds(opts.WindowSizes[key]); b != nil {
		return b
	}
	if key == WindowSizeNormal {
		if b := FixBounds(opts.Bounds); b != nil {
			return b
		}
	}
	return defaultWindowSize(key)
}

func captureCurrentBounds(ctx context.Context) *Rectangle {
	if runtime.WindowIsMaximised(ctx) || runtime.WindowIsMinimised(ctx) {
		return nil
	}
	x, y := runtime.WindowGetPosition(ctx)
	w, h := runtime.WindowGetSize(ctx)
	return FixBounds(&Rectangle{X: x, Y: y, Width: w, Height: h})
}

func applyWindowBounds(ctx context.Context, bounds *Rectangle) {
	if bounds == nil {
		return
	}
	runtime.WindowSetSize(ctx, bounds.Width, bounds.Height)
	winapp.SetWindowPositionAbsolute(ctx, bounds.X, bounds.Y)
}

func (a *App) saveWindowOptions(ctx context.Context) {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		opts = &IniOptions{}
	}
	migrateWindowSizes(opts)

	key := normalizeWindowSizeKey(opts.WindowSizeKey)
	if captured := captureCurrentBounds(ctx); captured != nil {
		opts.WindowSizes[key] = captured
	}
	// Maximized/minimized: leave the active key's prior geometry untouched.

	opts.WindowSizeKey = key
	// Mirror active size into legacy Bounds for older tooling / one-release compat.
	opts.Bounds = ActiveWindowBounds(opts, key)

	opts.DevTools = winapp.IsDevToolsOpen()
	// Other fields already loaded via LoadIniFileOptions above.

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

// GetZoomLevelOption returns the persisted zoom level (1.2^level steps; 0 == 100%).
func GetZoomLevelOption() float64 {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		return 0
	}
	return opts.ZoomLevel
}

// SetZoomLevelOption updates only the zoom level, preserving other ini fields.
func SetZoomLevelOption(level float64) error {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.ZoomLevel = level
	return saveIniFileOptions(opts)
}

func GetWindowSizeKeyOption() string {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		return WindowSizeNormal
	}
	migrateWindowSizes(opts)
	return normalizeWindowSizeKey(opts.WindowSizeKey)
}

// SetWindowSizeKeyOption saves the current window geometry under the active key,
// switches to the requested key, applies that geometry, and persists immediately.
// Unknown keys are accepted so future named sizes can be added without API changes.
func (a *App) SetWindowSizeKeyOption(ctx context.Context, key string) (string, error) {
	key = normalizeWindowSizeKey(key)

	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		opts = &IniOptions{}
	}
	migrateWindowSizes(opts)

	currentKey := normalizeWindowSizeKey(opts.WindowSizeKey)
	if captured := captureCurrentBounds(ctx); captured != nil {
		opts.WindowSizes[currentKey] = captured
	}

	opts.WindowSizeKey = key

	target := ActiveWindowBounds(opts, key)
	// First visit to a size with only defaults: keep the current screen position.
	if FixBounds(opts.WindowSizes[key]) == nil {
		if captured := captureCurrentBounds(ctx); captured != nil {
			target = &Rectangle{
				X:      captured.X,
				Y:      captured.Y,
				Width:  target.Width,
				Height: target.Height,
			}
		}
		opts.WindowSizes[key] = target
	}

	if runtime.WindowIsMaximised(ctx) {
		runtime.WindowUnmaximise(ctx)
	}
	if runtime.WindowIsMinimised(ctx) {
		runtime.WindowUnminimise(ctx)
	}
	applyWindowBounds(ctx, target)

	opts.Bounds = target
	if err := saveIniFileOptions(opts); err != nil {
		return "", err
	}
	return key, nil
}

// ToggleWindowSizeOption flips between normal and mini (the current UI is a
// simple toggle; SetWindowSizeKeyOption supports arbitrary future keys).
func (a *App) ToggleWindowSizeOption(ctx context.Context) (string, error) {
	current := GetWindowSizeKeyOption()
	next := WindowSizeMini
	if current == WindowSizeMini {
		next = WindowSizeNormal
	}
	return a.SetWindowSizeKeyOption(ctx, next)
}

func (a *App) restoreWindowOptions(ctx context.Context) {
	var bounds *Rectangle
	opts, err := LoadIniFileOptions()
	if err == nil && opts != nil {
		migrateWindowSizes(opts)
		bounds = ActiveWindowBounds(opts, opts.WindowSizeKey)
	}

	// Apply geometry while still hidden (StartHidden), then show. Size uses
	// Wails DIP APIs; position uses absolute virtual-screen coords (see
	// SetWindowPositionAbsolute) so shortcut vs direct .exe launch does not
	// depend on which monitor Windows initially assigned the window.
	if bounds != nil {
		applyWindowBounds(ctx, bounds)
	}

	runtime.WindowShow(ctx)
	runtime.WindowUnminimise(ctx)
	if runtime.WindowIsMaximised(ctx) {
		runtime.WindowUnmaximise(ctx)
		if bounds != nil {
			applyWindowBounds(ctx, bounds)
		}
	}

	a.windowMu.Lock()
	a.windowVisible = true
	a.windowMu.Unlock()
}
