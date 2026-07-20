//go:build windows

package backend

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// RevealInExplorer opens File Explorer with path selected (highlighted).
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
	// /select,<path> highlights the file. Start (not Run) — explorer often
	// returns a non-zero exit code even when it succeeds.
	return exec.Command("explorer", "/select,"+abs).Start()
}
