//go:build windows

package winpicker

import "testing"

func TestCreateOverlaySmoke(t *testing.T) {
	s := NewSession()
	s.iconMode = DragIconLayeredWindow
	if !s.createOverlay() {
		t.Fatal("createOverlay failed")
	}
	s.moveOverlay()
	s.destroyOverlay()
	if s.overlayHwnd != 0 {
		t.Fatal("overlay hwnd should be cleared")
	}
}
