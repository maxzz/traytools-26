//go:build !windows

package copyops

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func normalizeDroppedPath(path, kind string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("empty path")
	}
	path = filepath.Clean(path)

	info, err := os.Stat(path)
	if err != nil {
		if strings.EqualFold(kind, "folder") && filepath.Ext(path) != "" {
			return filepath.Dir(path), nil
		}
		return path, nil
	}

	if strings.EqualFold(kind, "folder") {
		if info.IsDir() {
			return path, nil
		}
		return filepath.Dir(path), nil
	}

	if info.IsDir() {
		return "", fmt.Errorf("expected a file, got a folder: %s", path)
	}
	return path, nil
}
