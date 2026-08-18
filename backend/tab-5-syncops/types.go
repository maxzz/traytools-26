package syncops

const Group = "syncops"

const (
	EventProgress = "syncops:progress"
	EventJobDone  = "syncops:jobDone"
)

type RawResponse struct {
	Found   bool   `json:"found"`
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

type SaveResponse struct {
	Path string `json:"path"`
}

type PickResponse struct {
	Canceled bool   `json:"canceled"`
	Path     string `json:"path,omitempty"`
}

type NormalizeDropPathRequest struct {
	Path string `json:"path"`
	Kind string `json:"kind"` // "file" | "folder"
}

type NormalizeDropPathResponse struct {
	Path string `json:"path"`
}

type FolderPairRequest struct {
	SourceFolder string `json:"sourceFolder"`
	DestFolder   string `json:"destFolder"`
	// SkipPatterns: omitted/nil → default .git / node_modules skip list.
	// Pointer to an empty slice → skip nothing (copy everything).
	// Any other slice → those regular expressions.
	SkipPatterns *[]string `json:"skipPatterns"`
}

/** TreeReportDTO and ChangeDTO are used to report the changes in the tree. DTO stands for Data Transfer Object. */
type ChangeDTO struct {
	Marker      string `json:"marker"`
	RelPath     string `json:"relPath"`
	DisplayName string `json:"displayName,omitempty"`
}

type TreeNodeDTO struct {
	Name      string        `json:"name"`
	FileCount int           `json:"fileCount"`
	Children  []TreeNodeDTO `json:"children"`
	Changes   []ChangeDTO   `json:"changes"`
}

type TreeReportDTO struct {
	FirstLevel  []TreeNodeDTO `json:"firstLevel"`
	RootChanges []ChangeDTO   `json:"rootChanges"`
}

type CheckResponse struct {
	Identical       bool          `json:"identical"`
	SourceRootLabel string        `json:"sourceRootLabel"`
	SourceFileCount int           `json:"sourceFileCount"`
	FolderCount     int           `json:"folderCount"`
	ChangeCount     int           `json:"changeCount"`
	Changes         []ChangeDTO   `json:"changes"`
	Tree            TreeReportDTO `json:"tree"`
}

type SyncStartResponse struct {
	JobID string `json:"jobId"`
	Error string `json:"error,omitempty"`
}

type ProgressEvent struct {
	JobID   string `json:"jobId"`
	Message string `json:"message"`
}

type JobDoneEvent struct {
	JobID           string      `json:"jobId"`
	Error           string      `json:"error,omitempty"`
	SourceFileCount int         `json:"sourceFileCount,omitempty"`
	ChangeCount     int         `json:"changeCount,omitempty"`
	Changes         []ChangeDTO `json:"changes,omitempty"`
}
