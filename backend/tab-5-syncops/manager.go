package syncops

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync/atomic"

	"traytools-26-go/backend/bus"
)

// Manager owns sync.json access, native dialogs, and sync/check operations.
type Manager struct {
	ctx    context.Context
	jobSeq atomic.Uint64
}

// New creates a Manager. Start must be called with the Wails context before
// dialogs or events can be used.
func New() *Manager {
	return &Manager{}
}

// Start binds the Wails context used for dialogs and EventsEmit.
func (m *Manager) Start(ctx context.Context) {
	m.ctx = ctx
}

// Register wires the syncops command group onto the bus.
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
	b.Register(Group, "pickFolder", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			InitialPath string `json:"initialPath"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.pickFolder(req.InitialPath)
	})
	b.Register(Group, "exportPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			DefaultFilename string `json:"defaultFilename"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.exportPath(req.DefaultFilename)
	})
	b.Register(Group, "importPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.importPath()
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
		data, err := os.ReadFile(req.Path)
		if err != nil {
			return nil, err
		}
		return map[string]string{"content": string(data)}, nil
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
		if err := os.MkdirAll(filepath.Dir(req.Path), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(req.Path, []byte(req.Content), 0o644); err != nil {
			return nil, err
		}
		return SaveResponse{Path: req.Path}, nil
	})
	b.Register(Group, "normalizeDropPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req NormalizeDropPathRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		path, err := normalizeDroppedPath(req.Path, req.Kind)
		if err != nil {
			return nil, err
		}
		return NormalizeDropPathResponse{Path: filepath.ToSlash(path)}, nil
	})
	b.Register(Group, "sync", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req FolderPairRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.startSync(req), nil
	})
	b.Register(Group, "check", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req FolderPairRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.runCheck(req)
	})
}

func (m *Manager) getRaw() RawResponse {
	content, path, found, err := readRawConfig()
	if err != nil {
		return RawResponse{Found: found, Path: path, Error: err.Error()}
	}
	return RawResponse{Found: found, Path: path, Content: content}
}
