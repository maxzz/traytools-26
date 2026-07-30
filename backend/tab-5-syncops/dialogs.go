package syncops

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (m *Manager) pickFolder(initialPath string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("syncops: not started")
	}
	opts := runtime.OpenDialogOptions{
		Title: "Select folder",
	}
	if dir := dialogDefaultsForFolder(initialPath); dir != "" {
		opts.DefaultDirectory = dir
	}
	path, err := runtime.OpenDirectoryDialog(m.ctx, opts)
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

func dialogDefaultsForFolder(path string) string {
	path = filepath.Clean(strings.TrimSpace(path))
	if path == "" || path == "." {
		return ""
	}
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return ""
	}
	return path
}

func (m *Manager) importPath() (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("syncops: not started")
	}
	path, err := runtime.OpenFileDialog(m.ctx, runtime.OpenDialogOptions{
		Title: "Import sync operations",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON (*.json)", Pattern: "*.json"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

func (m *Manager) exportPath(defaultFilename string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("syncops: not started")
	}
	if defaultFilename == "" {
		defaultFilename = "sync.json"
	}
	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Export sync operations",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON (*.json)", Pattern: "*.json"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

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
