//go:build !windows

package recycle

import "fmt"

// MoveToRecycleBin is not supported on non-Windows platforms.
func MoveToRecycleBin(path string) error {
	return fmt.Errorf("recycle bin: not supported on this platform")
}
