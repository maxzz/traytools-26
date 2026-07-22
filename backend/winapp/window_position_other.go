//go:build !windows

package winapp

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func SetWindowPositionAbsolute(ctx context.Context, x, y int) {
	runtime.WindowSetPosition(ctx, x, y)
}
