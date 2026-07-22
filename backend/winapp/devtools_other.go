//go:build !windows

package winapp

// IsDevToolsOpen is always false on non-Windows platforms.
func IsDevToolsOpen() bool { return false }

// CloseDevTools is a no-op on non-Windows platforms.
func CloseDevTools() {}
