//go:build !windows

package winpicker

// DragIconMode is a no-op token on non-Windows builds.
type DragIconMode int

const (
	DragIconSystemCursor DragIconMode = iota
	DragIconLayeredWindow
	DragIconLayeredWindowShowCursor
)

// ParseDragIconMode maps the frontend setting; unused on non-Windows.
func ParseDragIconMode(s string) DragIconMode {
	return DragIconLayeredWindow
}

// Session is an idle finder stub on non-Windows platforms.
type Session struct{}

// NewSession returns an idle finder session.
func NewSession() *Session {
	return &Session{}
}

// Start cannot track windows without Win32; always fails.
func (s *Session) Start(onEvent func(json string), iconMode DragIconMode) bool {
	return false
}

// Stop is a no-op.
func (s *Session) Stop() bool {
	return false
}
