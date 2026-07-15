package backend

import (
	"log"
	"traytools-26-go/backend/hotkeys"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const EventUnloadHookHotkey = "hotkey:unloadHook"

func (a *App) startHotkeys() {
	hotkeys.Start(func(id int) {
		if id != hotkeys.IDUnloadHook || a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, EventUnloadHookHotkey, nil)
	})

	opts := GetUnloadHookHotkeyOptions()
	if err := applyUnloadHookHotkey(opts.Hotkey, opts.Global); err != nil {
		log.Printf("hotkeys: apply unload-hook binding: %v", err)
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
