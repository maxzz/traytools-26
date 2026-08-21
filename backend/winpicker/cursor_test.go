//go:build windows

package winpicker

import "testing"

func TestCreateCursorFromPNG(t *testing.T) {
	h := createCursorFromPNG(targetPNG)
	if h == 0 {
		t.Fatal("createCursorFromPNG returned 0")
	}
	procDestroyIcon.Call(h)
}
