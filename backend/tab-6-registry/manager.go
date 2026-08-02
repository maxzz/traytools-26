package registryops

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"traytools-26-go/backend/bus"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Manager owns registry.json access, native dialogs, and registry batches.
type Manager struct {
	ctx context.Context
}

// New creates a Manager. Start must be called with the Wails context before
// dialogs can be used.
func New() *Manager {
	return &Manager{}
}

// Start binds the Wails context used for dialogs.
func (m *Manager) Start(ctx context.Context) {
	m.ctx = ctx
}

// Register wires the registryops command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getRaw", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.getRaw(), nil
	})
	b.Register(Group, "save", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Content string `json:"content"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		path, err := saveRawConfig(req.Content)
		if err != nil {
			return nil, err
		}
		return SaveResponse{Path: path}, nil
	})
	b.Register(Group, "importPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Kind string `json:"kind"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.importPath(req.Kind)
	})
	b.Register(Group, "exportPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			DefaultFilename string `json:"defaultFilename"`
			Kind            string `json:"kind"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.exportPath(req.DefaultFilename, req.Kind)
	})
	b.Register(Group, "readTextFile", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Path string `json:"path"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		content, err := readTextFile(req.Path)
		if err != nil {
			return nil, err
		}
		return map[string]string{"content": content}, nil
	})
	b.Register(Group, "writeTextFile", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := writeTextFile(req.Path, req.Content); err != nil {
			return nil, err
		}
		return SaveResponse{Path: req.Path}, nil
	})
	b.Register(Group, "readBatch", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req BatchRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return ReadBatchResponse{Results: readBatch(req.Items)}, nil
	})
	b.Register(Group, "writeBatch", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req BatchRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return WriteBatchResponse{Results: writeBatch(req.Items)}, nil
	})
	b.Register(Group, "jump", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Hive    string `json:"hive"`
			KeyPath string `json:"keyPath"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		target := strings.TrimSpace(req.Hive)
		if sub := strings.Trim(strings.TrimSpace(req.KeyPath), `\`); sub != "" {
			target += `\` + sub
		}
		return nil, jumpToKey(target)
	})
}

func readBatch(items []ValueSpec) []ReadResult {
	results := make([]ReadResult, 0, len(items))
	for i, item := range items {
		res := readValue(item)
		res.Index = i
		results = append(results, res)
	}
	return results
}

func writeBatch(items []ValueSpec) []WriteResult {
	results := make([]WriteResult, 0, len(items))
	for i, item := range items {
		res := writeValue(item)
		res.Index = i
		results = append(results, res)
	}
	return results
}

func (m *Manager) getRaw() RawResponse {
	content, path, found, err := readRawConfig()
	if err != nil {
		return RawResponse{Found: found, Path: path, Error: err.Error()}
	}
	return RawResponse{Found: found, Path: path, Content: content}
}

// dialogFilters orders the file-type filters so the requested kind comes first
// and therefore becomes the dialog's default.
func dialogFilters(kind string) []runtime.FileFilter {
	jsonFilter := runtime.FileFilter{DisplayName: "JSON (*.json)", Pattern: "*.json"}
	regFilter := runtime.FileFilter{DisplayName: "Registry files (*.reg)", Pattern: "*.reg"}
	allFilter := runtime.FileFilter{DisplayName: "All files (*.*)", Pattern: "*.*"}

	if strings.EqualFold(kind, "reg") {
		return []runtime.FileFilter{regFilter, jsonFilter, allFilter}
	}
	return []runtime.FileFilter{jsonFilter, regFilter, allFilter}
}

func (m *Manager) importPath(kind string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("registryops: not started")
	}
	path, err := runtime.OpenFileDialog(m.ctx, runtime.OpenDialogOptions{
		Title:   "Import registry operations",
		Filters: dialogFilters(kind),
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

func (m *Manager) exportPath(defaultFilename, kind string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("registryops: not started")
	}
	if defaultFilename == "" {
		if strings.EqualFold(kind, "reg") {
			defaultFilename = "registry.reg"
		} else {
			defaultFilename = "registry.json"
		}
	}
	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Export registry operations",
		DefaultFilename: defaultFilename,
		Filters:         dialogFilters(kind),
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}
