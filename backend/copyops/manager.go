package copyops

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"

	"traytools-26-go/backend/bus"
	"traytools-26-go/backend/dpagent"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Manager owns copy.json access, native dialogs, and async copy batches.
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

// Register wires the copyops command group onto the bus.
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
	b.Register(Group, "pickFile", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.pickFile()
	})
	b.Register(Group, "pickFolder", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.pickFolder()
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
	b.Register(Group, "copyBatch", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req CopyBatchRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.startCopyBatch(req), nil
	})
}

func (m *Manager) getRaw() RawResponse {
	content, path, found, err := readRawConfig()
	if err != nil {
		return RawResponse{Found: found, Path: path, Error: err.Error()}
	}
	return RawResponse{Found: found, Path: path, Content: content}
}

func (m *Manager) pickFile() (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	path, err := runtime.OpenFileDialog(m.ctx, runtime.OpenDialogOptions{
		Title: "Select source file",
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: path}, nil
}

func (m *Manager) pickFolder() (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	path, err := runtime.OpenDirectoryDialog(m.ctx, runtime.OpenDialogOptions{
		Title: "Select destination folder",
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: path}, nil
}

func (m *Manager) importPath() (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	path, err := runtime.OpenFileDialog(m.ctx, runtime.OpenDialogOptions{
		Title: "Import copy operations",
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
	return PickResponse{Path: path}, nil
}

func (m *Manager) exportPath(defaultFilename string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	if defaultFilename == "" {
		defaultFilename = "copy.json"
	}
	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Export copy operations",
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
	return PickResponse{Path: path}, nil
}

func (m *Manager) startCopyBatch(req CopyBatchRequest) CopyBatchResponse {
	jobID := fmt.Sprintf("job-%d", m.jobSeq.Add(1))

	if req.RequireElevated && !processIsElevated() {
		return CopyBatchResponse{JobID: jobID, NeedsElevation: true, Error: "needsElevation"}
	}

	go m.runCopyBatch(jobID, req)
	return CopyBatchResponse{JobID: jobID}
}

func (m *Manager) runCopyBatch(jobID string, req CopyBatchRequest) {
	if req.StopDpAgent {
		if err := dpagent.EnsureStopped(dpagent.DefaultEnsureStoppedTimeout); err != nil {
			m.emitJobDone(jobID, err.Error())
			return
		}
	}

	for i, item := range req.Items {
		status, err := copyOneFile(item.SourceFile, item.DestFolder)
		ev := ItemStatusEvent{
			JobID:      jobID,
			Index:      i,
			SourceFile: item.SourceFile,
			DestFolder: item.DestFolder,
			Status:     status,
		}
		if err != nil {
			ev.Status = StatusFailed
			ev.Error = err.Error()
		}
		m.emitItemStatus(ev)
	}

	m.emitJobDone(jobID, "")
}

func (m *Manager) emitItemStatus(ev ItemStatusEvent) {
	if m.ctx == nil {
		return
	}
	runtime.EventsEmit(m.ctx, EventItemStatus, ev)
}

func (m *Manager) emitJobDone(jobID, errMsg string) {
	if m.ctx == nil {
		return
	}
	runtime.EventsEmit(m.ctx, EventJobDone, JobDoneEvent{JobID: jobID, Error: errMsg})
}
