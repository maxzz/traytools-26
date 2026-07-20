//go:build windows

package copyops

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
)

// normalizeDroppedPath prepares a path from a drag-and-drop operation:
//   - .lnk shortcuts are resolved to their target
//   - kind "folder": directories kept as-is; files reduced to their parent directory
//   - kind "file": the resolved file path is returned
func normalizeDroppedPath(path, kind string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("empty path")
	}
	path = filepath.Clean(path)

	resolved, err := resolveIfShortcut(path)
	if err != nil {
		return "", err
	}

	info, err := os.Stat(resolved)
	if err != nil {
		// Target may be missing; still return a sensible path for the field kind.
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

	// kind == "file"
	if info.IsDir() {
		return "", fmt.Errorf("expected a file, got a folder: %s", resolved)
	}
	return resolved, nil
}

func resolveIfShortcut(path string) (string, error) {
	if !strings.EqualFold(filepath.Ext(path), ".lnk") {
		return path, nil
	}
	target, err := resolveShortcutTarget(path)
	if err != nil {
		return "", fmt.Errorf("resolve shortcut %q: %w", path, err)
	}
	if strings.TrimSpace(target) == "" {
		return "", fmt.Errorf("shortcut %q has an empty target", path)
	}
	return filepath.Clean(target), nil
}

// resolveShortcutTarget reads a .lnk via WScript.Shell COM automation.
func resolveShortcutTarget(lnkPath string) (string, error) {
	abs, err := filepath.Abs(lnkPath)
	if err != nil {
		abs = lnkPath
	}

	if err := ole.CoInitialize(0); err != nil {
		if !isCOMAlreadyInitialized(err) {
			return "", err
		}
	} else {
		defer ole.CoUninitialize()
	}

	unknown, err := oleutil.CreateObject("WScript.Shell")
	if err != nil {
		return "", err
	}
	defer unknown.Release()

	shell, err := unknown.QueryInterface(ole.IID_IDispatch)
	if err != nil {
		return "", err
	}
	defer shell.Release()

	cs, err := oleutil.CallMethod(shell, "CreateShortcut", abs)
	if err != nil {
		return "", err
	}
	shortcut := cs.ToIDispatch()
	if shortcut == nil {
		return "", fmt.Errorf("CreateShortcut returned nil")
	}
	defer shortcut.Release()

	prop, err := oleutil.GetProperty(shortcut, "TargetPath")
	if err != nil {
		return "", err
	}
	defer prop.Clear()
	return prop.ToString(), nil
}

func isCOMAlreadyInitialized(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	// RPC_E_CHANGED_MODE / S_FALSE variants from CoInitialize when already set up.
	return strings.Contains(msg, "already") ||
		strings.Contains(msg, "changed mode") ||
		strings.Contains(msg, "0x80010106") ||
		strings.Contains(msg, "0x00000001") ||
		strings.Contains(msg, "s_false")
}
