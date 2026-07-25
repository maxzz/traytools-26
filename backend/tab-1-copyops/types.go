// Package copyops implements the Copy Operations editor: disk-backed copy.json,
// native path dialogs, and batched single-file copy with per-item status events.
package copyops

// Group is the bus group name shared with the frontend bridge.
const Group = "copyops"

// Event names pushed to the frontend while a copy batch runs.
const (
	EventItemStatus = "copyops:itemStatus"
	EventJobDone    = "copyops:jobDone"
)

// Copy item status values reported in ItemStatusEvent.
const (
	StatusSkipped = "skipped"
	StatusCopied  = "copied"
	StatusFailed  = "failed"
	// StatusRenamed is emitted when a locked destination was renamed before retry.
	StatusRenamed = "renamed"
)

// RawResponse is returned by the "getRaw" command.
type RawResponse struct {
	Found   bool   `json:"found"`
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

// SaveResponse is returned by the "save" command.
type SaveResponse struct {
	Path string `json:"path"`
}

// PickResponse is returned by pickFile / pickFolder / exportPath dialogs.
type PickResponse struct {
	Canceled bool   `json:"canceled"`
	Path     string `json:"path,omitempty"`
}

// NormalizeDropPathRequest is the payload for "normalizeDropPath".
type NormalizeDropPathRequest struct {
	Path string `json:"path"`
	Kind string `json:"kind"` // "file" | "folder"
}

// NormalizeDropPathResponse is returned by "normalizeDropPath".
type NormalizeDropPathResponse struct {
	Path string `json:"path"`
}

// CopyItemSpec is one source→destination copy in a batch.
type CopyItemSpec struct {
	SourceFile string `json:"sourceFile"`
	DestFolder string `json:"destFolder"`
}

// CopyBatchRequest is the payload for the "copyBatch" command.
type CopyBatchRequest struct {
	StopDpAgent     bool           `json:"stopDpAgent"`
	RequireElevated bool           `json:"requireElevated"`
	RenameLocked    bool           `json:"renameLocked"`
	Items           []CopyItemSpec `json:"items"`
}

// CopyBatchResponse is returned immediately when a job is accepted.
type CopyBatchResponse struct {
	JobID          string `json:"jobId"`
	NeedsElevation bool   `json:"needsElevation,omitempty"`
	Error          string `json:"error,omitempty"`
}

// LockedProcess is a process holding a file open (from Restart Manager).
type LockedProcess struct {
	Name string `json:"name"`
	PID  uint32 `json:"pid"`
}

// ItemStatusEvent is emitted once per item as the batch progresses.
// When RenameLocked renames a locked destination, StatusRenamed is emitted
// first (with LockedRenamedTo), then a final skipped|copied|failed event.
// LockingProcesses is set when Access Denied / sharing violation occurs and
// Restart Manager can identify holders of the path.
type ItemStatusEvent struct {
	JobID            string          `json:"jobId"`
	Index            int             `json:"index"`
	SourceFile       string          `json:"sourceFile"`
	DestFolder       string          `json:"destFolder"`
	Status           string          `json:"status"` // skipped | copied | failed | renamed
	Error            string          `json:"error,omitempty"`
	LockedRenamedTo  string          `json:"lockedRenamedTo,omitempty"`
	LockingProcesses []LockedProcess `json:"lockingProcesses,omitempty"`
}

// JobDoneEvent is emitted when a batch finishes (successfully or with setup failure).
type JobDoneEvent struct {
	JobID string `json:"jobId"`
	Error string `json:"error,omitempty"`
}
