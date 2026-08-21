//go:build windows

package winpicker

import "testing"

func TestProbeCursor(t *testing.T) {
	ev := probeCursor(false)
	t.Logf("screen=%d,%d client=%d,%d process=%q handle=%s root=%s title=%q",
		ev.Screen.X, ev.Screen.Y, ev.Client.X, ev.Client.Y, ev.ProcessName, ev.Handle, ev.RootHandle, ev.Title)
	if ev.Released {
		t.Fatal("expected released=false")
	}
	if ev.Handle == "" && ev.ProcessName == "" {
		t.Fatal("expected a window under the cursor (desktop at minimum)")
	}
}
