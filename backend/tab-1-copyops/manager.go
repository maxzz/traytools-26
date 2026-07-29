package copyops

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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
		var req struct {
			InitialPath string `json:"initialPath"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.pickFile(req.InitialPath)
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
		// Prefer forward slashes for UI / JSON; Windows accepts both at launch.
		return NormalizeDropPathResponse{Path: filepath.ToSlash(path)}, nil
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

func (m *Manager) pickFile(initialPath string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	dir, name := dialogDefaultsForFile(initialPath)
	opts := runtime.OpenDialogOptions{
		Title: "Select source file",
	}
	if dir != "" {
		opts.DefaultDirectory = dir
	}
	if name != "" {
		opts.DefaultFilename = name
	}
	path, err := runtime.OpenFileDialog(m.ctx, opts)
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

func (m *Manager) pickFolder(initialPath string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("copyops: not started")
	}
	opts := runtime.OpenDialogOptions{
		Title: "Select destination folder",
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

// dialogDefaultsForFile returns DefaultDirectory / DefaultFilename for an open-file
// dialog. Directory is set only when it exists so Wails does not reject the options.
func dialogDefaultsForFile(path string) (dir, filename string) {
	path = filepath.Clean(strings.TrimSpace(path))
	if path == "" || path == "." {
		return "", ""
	}
	info, err := os.Stat(path)
	if err == nil {
		if info.IsDir() {
			return path, ""
		}
		return filepath.Dir(path), filepath.Base(path)
	}
	// File missing: still open at the parent folder when that exists.
	parent := filepath.Dir(path)
	if parent == "" || parent == "." {
		return "", ""
	}
	if fi, err := os.Stat(parent); err == nil && fi.IsDir() {
		return parent, filepath.Base(path)
	}
	return "", ""
}

// dialogDefaultsForFolder returns DefaultDirectory for an open-folder dialog when
// the path itself exists as a directory; otherwise leave empty (last-used folder).
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
	return PickResponse{Path: filepath.ToSlash(path)}, nil
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
	return PickResponse{Path: filepath.ToSlash(path)}, nil
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
		m.copyOneItem(jobID, i, item, req.RenameLocked)
	}

	m.emitJobDone(jobID, "")
}

func (m *Manager) copyOneItem(jobID string, index int, item CopyItemSpec, renameLocked bool) {
	src := filepath.Clean(item.SourceFile)
	dstDir := filepath.Clean(item.DestFolder)
	destPath := filepath.Join(dstDir, filepath.Base(src))

	base := ItemStatusEvent{
		JobID:      jobID,
		Index:      index,
		SourceFile: item.SourceFile,
		DestFolder: item.DestFolder,
	}

	status, err := copyOneFile(item.SourceFile, item.DestFolder)
	if err == nil || !renameLocked || !isAccessDenied(err) {
		ev := base
		ev.Status = status
		if err != nil {
			ev.Status = StatusFailed
			ev.Error = err.Error()
			if isAccessDenied(err) {
				ev.LockingProcesses = lockingProcessesForAccessDenied(err, destPath)
			}
		}
		m.emitItemStatus(ev)
		return
	}

	procs := lockingProcessesForAccessDenied(err, destPath)

	renamedTo, renameErr := renameLockedDestination(item.SourceFile, item.DestFolder)
	if renameErr != nil {
		ev := base
		ev.Status = StatusFailed
		ev.Error = fmt.Sprintf("%v (rename locked dest failed: %v)", err, renameErr)
		ev.LockingProcesses = procs
		if len(ev.LockingProcesses) == 0 && isAccessDenied(renameErr) {
			ev.LockingProcesses = lockingProcessesForAccessDenied(renameErr, destPath)
		}
		m.emitItemStatus(ev)
		return
	}

	renamedEv := base
	renamedEv.Status = StatusRenamed
	renamedEv.LockedRenamedTo = renamedTo
	renamedEv.LockingProcesses = procs
	m.emitItemStatus(renamedEv)

	status, err = copyOneFile(item.SourceFile, item.DestFolder)
	final := base
	final.LockedRenamedTo = renamedTo
	final.LockingProcesses = procs
	final.Status = status
	if err != nil {
		final.Status = StatusFailed
		final.Error = err.Error()
		if isAccessDenied(err) {
			if retryProcs := lockingProcessesForAccessDenied(err, destPath); len(retryProcs) > 0 {
				final.LockingProcesses = retryProcs
			}
		}
	}
	m.emitItemStatus(final)
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
