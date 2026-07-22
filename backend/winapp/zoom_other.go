//go:build !windows

package winapp

import "context"

// SetWebviewZoom is a no-op on non-Windows platforms (native WebView2 zoom is
// Windows-specific).
func SetWebviewZoom(_ context.Context, _ float64) {}
