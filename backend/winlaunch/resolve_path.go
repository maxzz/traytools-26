package winlaunch

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	envVarRe = regexp.MustCompile(`%([^%]+)%`)
	urlRe    = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9+.\-]*://`)
)

// expandEnvVars expands Windows-style %VAR% references. Unknown variables are
// left as-is so failures stay visible rather than becoming empty segments.
func expandEnvVars(s string) string {
	return envVarRe.ReplaceAllStringFunc(s, func(m string) string {
		name := m[1 : len(m)-1]
		if v, ok := os.LookupEnv(name); ok {
			return v
		}
		return m
	})
}

func isURL(s string) bool { return urlRe.MatchString(s) }

func hasPathSeparator(p string) bool {
	return strings.ContainsAny(p, `/\`) || filepath.VolumeName(p) != ""
}

// resolveExistingPath expands env macros, resolves bare executable names via
// PATH, and returns an absolute path that exists on disk.
func resolveExistingPath(path string) (string, error) {
	path = strings.TrimSpace(path)
	path = strings.Trim(path, `"'`)
	if path == "" || path == "." {
		return "", fmt.Errorf("empty path")
	}
	if isURL(path) {
		return "", fmt.Errorf("cannot reveal a URL")
	}

	path = expandEnvVars(path)
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("empty path after expanding environment variables")
	}

	if found, err := existingAbs(path); err == nil {
		return found, nil
	}

	// Bare name (e.g. notepad.exe): locate via PATH / PATHEXT.
	if !hasPathSeparator(path) {
		if looked, err := exec.LookPath(path); err == nil {
			if found, err := existingAbs(looked); err == nil {
				return found, nil
			}
			return looked, nil
		}
		return "", fmt.Errorf("%q not found on PATH", path)
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		abs = filepath.Clean(path)
	}
	if _, err := os.Stat(abs); err != nil {
		return "", err
	}
	return abs, nil
}

func existingAbs(path string) (string, error) {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return "", fmt.Errorf("empty path")
	}
	if _, err := os.Stat(path); err == nil {
		if filepath.IsAbs(path) {
			return path, nil
		}
		abs, absErr := filepath.Abs(path)
		if absErr != nil {
			return path, nil
		}
		return abs, nil
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if abs == path {
		return "", os.ErrNotExist
	}
	if _, err := os.Stat(abs); err != nil {
		return "", err
	}
	return abs, nil
}
