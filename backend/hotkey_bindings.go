package backend

import (
	"log"
	"traytools-26-go/backend/winhotkeys"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	EventUnloadHookHotkey = "hotkey:unloadHook"
	EventToolHotkey       = "hotkey:tool"
)

func (a *App) startHotkeys() {
	winhotkeys.Start(func(id int) {
		if a.ctx == nil {
			return
		}
		if id == winhotkeys.IDUnloadHook {
			runtime.EventsEmit(a.ctx, EventUnloadHookHotkey, nil)
			return
		}
		if cmdID, ok := winhotkeys.ToolCommandID(id); ok {
			runtime.EventsEmit(a.ctx, EventToolHotkey, map[string]any{"id": cmdID})
		}
	})

	opts := GetUnloadHookHotkeyOptions()
	if err := applyUnloadHookHotkey(opts.Hotkey, opts.Global); err != nil {
		log.Printf("winhotkeys: apply unload-hook binding: %v", err)
	}

	// Register Tools-menu global winhotkeys from tools.json. Conflicts are logged
	// here; the frontend re-syncs on load and surfaces them to the user.
	result := a.tools.SyncHotkeys()
	for _, c := range result.Conflicts {
		if c.Name != "" {
			log.Printf("winhotkeys: tool %q (%s): %s", c.Name, c.HotKey, c.Error)
		} else {
			log.Printf("winhotkeys: %s", c.Error)
		}
	}
}

func applyUnloadHookHotkey(hotkey string, global bool) error {
	if !global || hotkey == "" {
		return winhotkeys.Set(winhotkeys.IDUnloadHook, nil)
	}

	chord, err := winhotkeys.Parse(hotkey)
	if err != nil {
		_ = winhotkeys.Set(winhotkeys.IDUnloadHook, nil)
		return err
	}
	if chord == nil {
		return winhotkeys.Set(winhotkeys.IDUnloadHook, nil)
	}
	return winhotkeys.Set(winhotkeys.IDUnloadHook, chord)
}
