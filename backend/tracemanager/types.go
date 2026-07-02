// Package tracemanager is the Go port of the legacy C++/WTL Trace Manager
// (traytools/include/tracemanager). It exposes two features over the app
// command bus:
//
//  1. Trace windows — trace calls emitted by other processes are grouped by
//     process id and streamed to the frontend, which shows one "window"
//     (log list) per process. This mirrors the original CTraceManagerDlg +
//     per-process CTraceWindow collection.
//
//  2. Trace categories — the debug categories that each DigitalPersona
//     component (DLL) exposes through its gettraceinfo/settraceinfo exports.
//     They are presented as grouped checkboxes and can be loaded and saved.
//     This mirrors the original CTraceCheckboxesCtrl.
package tracemanager

// TraceCall is a single trace line coming from a traced process. It is the
// Go/JSON equivalent of the packed C++ tracecore::tmtrace::tracecall_t plus
// the decoded text and detected color highlight.
type TraceCall struct {
	ProcessID  uint32 `json:"processId"`
	ThreadID   uint32 `json:"threadId"`
	Module     uint32 `json:"module"`
	Function   string `json:"function"`
	Text       string `json:"text"`       // trace text with the color prefix already stripped
	ColorIndex int    `json:"colorIndex"` // 0..15 palette index, or -1 when there is no highlight
	Seq        uint64 `json:"seq"`        // monotonically increasing sequence number
	TimeMs     int64  `json:"timeMs"`     // unix milliseconds when the call was received
}

// StringDescription is one category bit shown as a checkbox. It mirrors the
// legacy debugus::string_decription_t.
type StringDescription struct {
	Category    uint32 `json:"category"`    // the category bit value (1 << Bit)
	Bit         int    `json:"bit"`         // the bit number (0..31)
	Description string `json:"description"` // human readable explanation
	Active      bool   `json:"active"`      // whether the category is currently enabled
	MemID       int    `json:"memId"`       // stable id across a section list (legacy memid)
}

// SectionDescription groups the category bits belonging to a single component.
// It mirrors the legacy debugus::section_decription_t.
type SectionDescription struct {
	SectionName string              `json:"sectionName"`
	Items       []StringDescription `json:"items"`
}

// assignMemIDs numbers every item across all sections sequentially, mirroring
// debugus::impl_ui::initmemids.
func assignMemIDs(sections []SectionDescription) {
	memid := 0
	for si := range sections {
		for ii := range sections[si].Items {
			sections[si].Items[ii].MemID = memid
			memid++
		}
	}
}
