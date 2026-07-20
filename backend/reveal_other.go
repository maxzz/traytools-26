//go:build !windows

package backend

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// RevealInExplorer opens the file's parent folder in the platform file manager.
// Selection/highlight of the file itself is Windows-only (explorer /select).
func RevealInExplorer(path string) error {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return fmt.Errorf("reveal: empty path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	if _, err := os.Stat(abs); err != nil {
		return fmt.Errorf("reveal: %w", err)
	}
	dir := filepath.Dir(abs)
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", "-R", abs).Start()
	default:
		return exec.Command("xdg-open", dir).Start()
	}
}
