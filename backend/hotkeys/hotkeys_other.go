//go:build !windows

package hotkeys

import "fmt"

const (
	IDUnloadHook = 1
	IDToolBase   = 1000
)

type Chord struct {
	Ctrl  bool
	Alt   bool
	Shift bool
	Key   string
}

type Handler func(id int)

func ToolHotkeyID(commandID int) int {
	return IDToolBase + commandID
}

func ToolCommandID(hotkeyID int) (commandID int, ok bool) {
	if hotkeyID <= IDToolBase {
		return 0, false
	}
	return hotkeyID - IDToolBase, true
}

func Start(_ Handler) {}

func Set(_ int, chord *Chord) error {
	if chord == nil {
		return nil
	}
	return fmt.Errorf("global hotkeys are only supported on Windows")
}

func ReplaceTools(bindings map[int]*Chord) map[int]string {
	if len(bindings) == 0 {
		return nil
	}
	failures := make(map[int]string, len(bindings))
	for id := range bindings {
		failures[id] = "global hotkeys are only supported on Windows"
	}
	return failures
}

func Parse(text string) (*Chord, error) {
	if text == "" {
		return nil, nil
	}
	return nil, fmt.Errorf("global hotkeys are only supported on Windows")
}

func Format(c *Chord) string {
	if c == nil {
		return ""
	}
	return c.Key
}
