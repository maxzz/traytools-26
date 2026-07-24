//go:build !windows

package winlaunch

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
	abs, err := resolveExistingPath(path)
	if err != nil {
		return fmt.Errorf("reveal: %w", err)
	}
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", "-R", abs).Start()
	default:
		return exec.Command("xdg-open", filepath.Dir(abs)).Start()
	}
}

// OpenInExplorer opens the folder at path in the platform file manager.
// If path is a file, opens its parent folder.
func OpenInExplorer(path string) error {
	abs, err := resolveExistingPath(path)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	info, err := os.Stat(abs)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	target := abs
	if !info.IsDir() {
		target = filepath.Dir(abs)
	}
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", target).Start()
	default:
		return exec.Command("xdg-open", target).Start()
	}
}

func resolveExistingPath(path string) (string, error) {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return "", fmt.Errorf("empty path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	if _, err := os.Stat(abs); err != nil {
		return "", err
	}
	return abs, nil
}
