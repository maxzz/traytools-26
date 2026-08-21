package fileicon

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ExtractMany loads icons for the given absolute (or resolvable) file paths.
// Missing / unreadable files yield an entry with an empty dataUrl.
func ExtractMany(paths []string) []Result {
	out := make([]Result, 0, len(paths))
	seen := make(map[string]struct{}, len(paths))

	for _, raw := range paths {
		path := strings.TrimSpace(raw)
		if path == "" {
			continue
		}
		key := normalizePathKey(path)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		dataURL, err := extractOne(path)
		res := Result{Path: path, DataURL: dataURL}
		if err != nil {
			res.Error = err.Error()
		}
		out = append(out, res)
	}
	return out
}

func extractOne(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = filepath.Clean(path)
	}
	if st, err := os.Stat(abs); err != nil || st.IsDir() {
		return "", fmt.Errorf("path not found")
	}

	png, err := extractPNG(abs)
	if err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), nil
}

func extractPNG(path string) ([]byte, error) {
	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".ico" {
		raw, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		return icoBytesToPNG(raw)
	}

	if ico, err := extractGroupIconICO(path); err == nil && len(ico) > 0 {
		if png, err := icoBytesToPNG(ico); err == nil {
			return png, nil
		}
	}

	// Shell / ExtractIconEx fallback (associations, protected modules, etc.).
	return extractViaShellPNG(path)
}

func normalizePathKey(path string) string {
	return strings.ToLower(filepath.Clean(strings.TrimSpace(path)))
}
