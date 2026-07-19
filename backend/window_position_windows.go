//go:build windows

package backend

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// setWindowPositionAbsolute places the window at absolute virtual-screen
// coordinates.
//
// Wails on Windows is asymmetric:
//   - WindowGetPosition returns GetWindowRect (absolute screen coords)
//   - WindowSetPosition treats (x,y) as offsets from the current monitor's
//     work-area origin and adds that origin before SetWindowPos
//
// So restoring a saved absolute position with WindowSetPosition alone moves
// the window relative to whichever monitor Windows initially chose — often
// the monitor under the cursor when launching from a shortcut. Probing the
// work-area origin first cancels that offset.
func setWindowPositionAbsolute(ctx context.Context, x, y int) {
	runtime.WindowSetPosition(ctx, 0, 0)
	ox, oy := runtime.WindowGetPosition(ctx)
	runtime.WindowSetPosition(ctx, x-ox, y-oy)
}
