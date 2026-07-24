//go:build !windows

package copyops

import "fmt"

func renameLockedDestination(sourceFile, destFolder string) (string, error) {
	return "", fmt.Errorf("rename locked destination is only supported on Windows")
}

func isAccessDenied(err error) bool {
	return false
}
