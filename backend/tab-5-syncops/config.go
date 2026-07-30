package syncops

import (
	"os"
	"path/filepath"
	"strings"
)

// EnvOverride, when set, points directly at a sync.json file.
const EnvOverride = "TRAYTOOLS_SYNC"

const appConfigDirName = "traytools-26-go"

func findConfigPath() (string, bool) {
	var candidates []string

	if v := strings.TrimSpace(os.Getenv(EnvOverride)); v != "" {
		candidates = append(candidates, v)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "tools", "sync.json"),
			filepath.Join(dir, "sync.json"),
		)
	}

	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "tools", "sync.json"),
			filepath.Join(wd, "sync.json"),
		)
	}

	if cfg, err := os.UserConfigDir(); err == nil {
		base := filepath.Join(cfg, appConfigDirName)
		candidates = append(candidates,
			filepath.Join(base, "tools", "sync.json"),
			filepath.Join(base, "sync.json"),
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
	return filepath.Join(dir, "sync.json"), nil
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
