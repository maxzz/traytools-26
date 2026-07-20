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

// CopyItemSpec is one source→destination copy in a batch.
type CopyItemSpec struct {
	SourceFile string `json:"sourceFile"`
	DestFolder string `json:"destFolder"`
}

// CopyBatchRequest is the payload for the "copyBatch" command.
type CopyBatchRequest struct {
	StopDpAgent     bool           `json:"stopDpAgent"`
	RequireElevated bool           `json:"requireElevated"`
	Items           []CopyItemSpec `json:"items"`
}

// CopyBatchResponse is returned immediately when a job is accepted.
type CopyBatchResponse struct {
	JobID          string `json:"jobId"`
	NeedsElevation bool   `json:"needsElevation,omitempty"`
	Error          string `json:"error,omitempty"`
}

// ItemStatusEvent is emitted once per item as the batch progresses.
type ItemStatusEvent struct {
	JobID      string `json:"jobId"`
	Index      int    `json:"index"`
	SourceFile string `json:"sourceFile"`
	DestFolder string `json:"destFolder"`
	Status     string `json:"status"` // skipped | copied | failed
	Error      string `json:"error,omitempty"`
}

// JobDoneEvent is emitted when a batch finishes (successfully or with setup failure).
type JobDoneEvent struct {
	JobID string `json:"jobId"`
	Error string `json:"error,omitempty"`
}
