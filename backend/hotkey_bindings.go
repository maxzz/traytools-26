package backend

import (
	"log"
	"traytools-26-go/backend/hotkeys"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	EventUnloadHookHotkey = "hotkey:unloadHook"
	EventToolHotkey       = "hotkey:tool"
)

func (a *App) startHotkeys() {
	hotkeys.Start(func(id int) {
		if a.ctx == nil {
			return
		}
		if id == hotkeys.IDUnloadHook {
			runtime.EventsEmit(a.ctx, EventUnloadHookHotkey, nil)
			return
		}
		if cmdID, ok := hotkeys.ToolCommandID(id); ok {
			runtime.EventsEmit(a.ctx, EventToolHotkey, map[string]any{"id": cmdID})
		}
	})

	opts := GetUnloadHookHotkeyOptions()
	if err := applyUnloadHookHotkey(opts.Hotkey, opts.Global); err != nil {
		log.Printf("hotkeys: apply unload-hook binding: %v", err)
	}

	// Register Tools-menu global hotkeys from tools.json. Conflicts are logged
	// here; the frontend re-syncs on load and surfaces them to the user.
	result := a.tools.SyncHotkeys()
	for _, c := range result.Conflicts {
		if c.Name != "" {
			log.Printf("hotkeys: tool %q (%s): %s", c.Name, c.HotKey, c.Error)
		} else {
			log.Printf("hotkeys: %s", c.Error)
		}
	}
}

func applyUnloadHookHotkey(hotkey string, global bool) error {
	if !global || hotkey == "" {
		return hotkeys.Set(hotkeys.IDUnloadHook, nil)
	}

	chord, err := hotkeys.Parse(hotkey)
	if err != nil {
		_ = hotkeys.Set(hotkeys.IDUnloadHook, nil)
		return err
	}
	if chord == nil {
		return hotkeys.Set(hotkeys.IDUnloadHook, nil)
	}
	return hotkeys.Set(hotkeys.IDUnloadHook, chord)
}
