//go:build !windows

package backend

// EnsureSingleInstanceOrExit is a no-op on non-Windows platforms. Wails handles
// single-instance locking during startup on Linux and macOS.
func EnsureSingleInstanceOrExit() {}
