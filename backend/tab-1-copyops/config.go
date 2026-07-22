package copyops

import (
	"os"
	"path/filepath"
	"strings"
)

// EnvOverride, when set, points directly at a copy.json file.
const EnvOverride = "TRAYTOOLS_COPY"

// appConfigDirName is the per-user config sub-directory (matches options.go).
const appConfigDirName = "traytools-26-go"

// findConfigPath returns the first existing copy.json from the search order:
//
//  1. $TRAYTOOLS_COPY
//  2. <exeDir>/tools/copy.json, <exeDir>/copy.json
//  3. ./tools/copy.json, ./copy.json
//  4. <userConfigDir>/<app>/tools/copy.json, .../copy.json
func findConfigPath() (string, bool) {
	var candidates []string

	if v := strings.TrimSpace(os.Getenv(EnvOverride)); v != "" {
		candidates = append(candidates, v)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "tools", "copy.json"),
			filepath.Join(dir, "copy.json"),
		)
	}

	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "tools", "copy.json"),
			filepath.Join(wd, "copy.json"),
		)
	}

	if cfg, err := os.UserConfigDir(); err == nil {
		base := filepath.Join(cfg, appConfigDirName)
		candidates = append(candidates,
			filepath.Join(base, "tools", "copy.json"),
			filepath.Join(base, "copy.json"),
		)
	}

	for _, c := range candidates {
		if c == "" {
			continue
		}
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			abs, err := filepath.Abs(c)
			if err != nil {
				abs = c
			}
			return abs, true
		}
	}

	return "", false
}

func writeConfigPath() (string, error) {
	if path, found := findConfigPath(); found {
		return path, nil
	}

	cfg, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(cfg, appConfigDirName, "tools")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "copy.json"), nil
}

func readRawConfig() (content string, path string, found bool, err error) {
	path, found = findConfigPath()
	if !found {
		return "", "", false, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", path, true, err
	}
	return string(data), path, true, nil
}

func saveRawConfig(content string) (string, error) {
	path, err := writeConfigPath()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
}
