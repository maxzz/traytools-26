//go:build windows

package winpicker

import (
	"strings"

	"traytools-26-go/backend/winpicker/win32"
)

// DragIconMode selects how the finder target is drawn while dragging.
type DragIconMode int

const (
	// DragIconSystemCursor replaces the system cursors with an HCURSOR (1-bit
	// mask; partial alpha looks jagged).
	DragIconSystemCursor DragIconMode = iota
	// DragIconLayeredWindow follows the pointer with a WS_EX_LAYERED overlay
	// using UpdateLayeredWindow(ULW_ALPHA) so PNG alpha is preserved. The
	// system pointer is hidden for the whole pick.
	DragIconLayeredWindow
	// DragIconLayeredWindowShowCursor is the same overlay, but the system
	// pointer stays visible (including when the overlay is under the hotspot).
	DragIconLayeredWindowShowCursor
)

// ParseDragIconMode maps the frontend setting ("cursor" | "overlay" | "overlay-show").
func ParseDragIconMode(s string) DragIconMode {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "cursor", "hcursor", "system":
		return DragIconSystemCursor
	case "overlay-show", "overlay-visible":
		return DragIconLayeredWindowShowCursor
	default:
		return DragIconLayeredWindow
	}
}

func (m DragIconMode) usesLayeredOverlay() bool {
	return m == DragIconLayeredWindow || m == DragIconLayeredWindowShowCursor
}

func (m DragIconMode) overlayShowsPointer() bool {
	return m == DragIconLayeredWindowShowCursor
}

// Event is the JSON payload emitted while the finder is active and once more
// when the mouse button is released (Released=true).
type Event struct {
	Released    bool        `json:"released"`
	ProcessName string      `json:"processName"`
	Screen      win32.Point `json:"screen"`
	Client      win32.Point `json:"client"`
	Handle      string      `json:"handle,omitempty"`
	RootHandle  string      `json:"rootHandle,omitempty"`
	Title       string      `json:"title,omitempty"`
}
