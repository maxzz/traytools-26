package progress

// Reporter receives progress updates during long-running operations.
type Reporter interface {
	BeginScan(rootLabel string)
	RecordFile(relPath string)
	RecordAction(marker rune, relPath string)
}
