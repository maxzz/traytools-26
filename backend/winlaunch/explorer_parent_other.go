//go:build !windows

package winlaunch

import "fmt"

// CreateProcessAsExplorerChild is Windows-only.
func CreateProcessAsExplorerChild(exe, args, workDir string) error {
	return fmt.Errorf("CreateProcessAsExplorerChild is only supported on Windows")
}
