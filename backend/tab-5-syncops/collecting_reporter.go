package syncops

import (
	"traytools-26-go/backend/tab-5-syncops/nm/progress"
)

// collectingReporter gathers source-scan folder counts and optional actions
// for BuildTreeReport, matching the CLI FolderDisplay semantics.
type collectingReporter struct {
	sourceRootLabel string
	scanRootLabel   string
	DirCounts       map[string]int
	TotalFiles      int
	Changes         []progress.ChangeEntry
}

func newCollectingReporter(sourceRootLabel string) *collectingReporter {
	return &collectingReporter{
		sourceRootLabel: sourceRootLabel,
		DirCounts:       make(map[string]int),
	}
}

func (r *collectingReporter) BeginScan(rootLabel string) {
	r.scanRootLabel = rootLabel
}

func (r *collectingReporter) RecordFile(relPath string) {
	if r.sourceRootLabel != "" && r.scanRootLabel != r.sourceRootLabel {
		return
	}
	r.TotalFiles++
	progress.RecordSubtreeCounts(r.DirCounts, relPath)
}

func (r *collectingReporter) RecordAction(marker rune, relPath string) {
	r.Changes = append(r.Changes, progress.ChangeEntry{Marker: marker, RelPath: relPath})
}
