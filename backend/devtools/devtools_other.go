//go:build !windows

package devtools

// IsOpen is always false on non-Windows platforms.
func IsOpen() bool { return false }

// Close is a no-op on non-Windows platforms.
func Close() {}
