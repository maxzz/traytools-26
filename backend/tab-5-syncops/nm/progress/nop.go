package progress

// NopReporter discards progress updates. Use in tests or when no UI is needed.
type NopReporter struct{}

func (NopReporter) BeginScan(string)        {}
func (NopReporter) RecordFile(string)       {}
func (NopReporter) RecordAction(rune, string) {}
