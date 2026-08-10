//go:build !windows

package winapp

// SetShowInTaskbar is a no-op on non-Windows platforms.
func SetShowInTaskbar(show bool) {}
