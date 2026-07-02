// Package tracemanager is the Go port of the legacy C++/WTL Trace Manager.
//
// It owns three concerns that the original dialog handled:
//
//   - trace categories (the bitmask of debug flags stored per DP component in
//     HKLM\SOFTWARE\DigitalPersona\Tracing), exposed as sections of checkboxes;
//   - registry / rundll32 side actions (open regedit at a key, export/import
//     the trace text file via dpocache.dll);
//   - a live stream of trace calls pushed to the frontend over Wails events,
//     grouped per process so the UI can render one trace window per PID.
//
// The original round-tripped the categories through the component DLLs
// (dpocache.dll et al.). Here we hit the registry directly, which is the
// equivalent operation those DLLs performed under the hood.
package tracemanager

// StringDescription is a single traceable category. In the legacy code each
// category was one bit in a per-component bitmask (categories_t); `Active`
// mirrors that bit and `MemID` is the stable id used to round-trip edits.
type StringDescription struct {
	MemID       int    `json:"memId"`
	Active      bool   `json:"active"`
	Description string `json:"description"`
}

// SectionDescription groups categories by DP component (DLL). The legacy code
// referred to this as the "section name" / former "componentname".
type SectionDescription struct {
	SectionName        string              `json:"sectionName"`
	StringDescriptions []StringDescription `json:"stringDescriptions"`
}

// TraceCall is one line in a trace window. It maps 1:1 to the legacy
// tracecore::tmtrace::tracecall_t, minus the heap-allocated tracetext blob
// which is flattened into FunctionName + Text here.
type TraceCall struct {
	ProcessID    uint32 `json:"processId"`
	ProcessName  string `json:"processName"`
	ThreadID     uint32 `json:"threadId"`
	Module       uint32 `json:"module"`
	FunctionName string `json:"functionName"`
	Text         string `json:"text"`
	Timestamp    int64  `json:"timestamp"`
}

// openRegeditRequest is the payload for the openRegedit command.
type openRegeditRequest struct {
	Key string `json:"key"`
}
