//go:build !windows

package copyops

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func normalizeDroppedPath(path, kind string, resolveURLFile bool) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("empty path")
	}
	path = filepath.Clean(path)

	resolved, err := resolveIfURLFile(path, resolveURLFile)
	if err != nil {
		return "", err
	}
	if isProbablyURL(resolved) {
		return resolved, nil
	}

	info, err := os.Stat(resolved)
	if err != nil {
		if strings.EqualFold(kind, "folder") && filepath.Ext(resolved) != "" {
			return filepath.Dir(resolved), nil
		}
		return resolved, nil
	}

	if strings.EqualFold(kind, "folder") {
		if info.IsDir() {
			return resolved, nil
		}
		return filepath.Dir(resolved), nil
	}

	if info.IsDir() {
		return "", fmt.Errorf("expected a file, got a folder: %s", resolved)
	}
	return resolved, nil
}

func isProbablyURL(s string) bool {
	s = strings.TrimSpace(s)
	return strings.Index(s, "://") > 0
}
