//go:build !windows

package copyops

import "fmt"

func copyOneFile(sourceFile, destFolder string) (status string, err error) {
	return StatusFailed, fmt.Errorf("copy operations are only supported on Windows")
}
