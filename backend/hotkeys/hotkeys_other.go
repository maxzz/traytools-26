//go:build !windows

package hotkeys

import "fmt"

const IDUnloadHook = 1

type Chord struct {
	Ctrl  bool
	Alt   bool
	Shift bool
	Key   string
}

type Handler func(id int)

func Start(_ Handler) {}

func Set(_ int, chord *Chord) error {
	if chord == nil {
		return nil
	}
	return fmt.Errorf("global hotkeys are only supported on Windows")
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
