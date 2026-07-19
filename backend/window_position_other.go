//go:build !windows

package backend

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func setWindowPositionAbsolute(ctx context.Context, x, y int) {
	runtime.WindowSetPosition(ctx, x, y)
}
