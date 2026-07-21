//go:build !windows

package backend

import "context"

// setWebviewZoom is a no-op on non-Windows platforms (native WebView2 zoom is
// Windows-specific).
func setWebviewZoom(_ context.Context, _ float64) {}
