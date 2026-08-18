package syncops

import (
	"fmt"
	"path/filepath"
	"strings"

	"traytools-26-go/backend/tab-5-syncops/nm/skippat"
	syncdir "traytools-26-go/backend/tab-5-syncops/nm/syncdir"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (m *Manager) startSync(req FolderPairRequest) SyncStartResponse {
	jobID := fmt.Sprintf("job-%d", m.jobSeq.Add(1))
	go m.runSyncJob(jobID, req)
	return SyncStartResponse{JobID: jobID}
}

func (m *Manager) runSyncJob(jobID string, req FolderPairRequest) {
	src := filepath.Clean(strings.TrimSpace(req.SourceFolder))
	dst := filepath.Clean(strings.TrimSpace(req.DestFolder))
	if src == "" || dst == "" || src == "." || dst == "." {
		m.emitJobDone(JobDoneEvent{JobID: jobID, Error: "sourceFolder and destFolder are required"})
		return
	}

	srcLabel := filepath.Base(src)
	reporter := newCollectingReporter(srcLabel)
	m.emitProgress(ProgressEvent{JobID: jobID, Message: fmt.Sprintf("Syncing %s → %s…", srcLabel, filepath.Base(dst))})

	result, err := syncdir.Sync(src, dst, syncdir.SyncOptions{
		SkipPatterns: skippat.FromOptional(req.SkipPatterns),
		Reporter:     reporter,
	})
	if err != nil {
		m.emitJobDone(JobDoneEvent{JobID: jobID, Error: err.Error()})
		return
	}

	m.emitJobDone(JobDoneEvent{
		JobID:           jobID,
		SourceFileCount: result.SourceFileCount,
		ChangeCount:     len(result.Changes),
		Changes:         changesToDTO(result.Changes),
	})
}

func (m *Manager) emitProgress(ev ProgressEvent) {
	if m.ctx == nil {
		return
	}
	runtime.EventsEmit(m.ctx, EventProgress, ev)
}

func (m *Manager) emitJobDone(ev JobDoneEvent) {
	if m.ctx == nil {
		return
	}
	runtime.EventsEmit(m.ctx, EventJobDone, ev)
}
