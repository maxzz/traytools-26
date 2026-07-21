package windowtree

// Bus group shared with the frontend bridge (groups/windowtree.ts).
const Group = "windowtree"

// WindowNode is one entry in the desktop window tree. It carries just enough
// information for the frontend to render the tree and pick an icon; the full
// per-window details are fetched lazily via getWindowInfo when a node is
// selected. Handles are serialized as strings because a HWND can exceed the
// range JavaScript numbers represent exactly on 64-bit builds.
type WindowNode struct {
	Handle      string       `json:"handle"`
	ClassName   string       `json:"className"`
	Title       string       `json:"title"`
	ProcessID   uint32       `json:"processId"`
	ThreadID    uint32       `json:"threadId"`
	ProcessName string       `json:"processName"`
	Style       uint32       `json:"style"`
	ExStyle     uint32       `json:"exStyle"`
	Visible     bool         `json:"visible"`
	Children    []WindowNode `json:"children,omitempty"`
}

// WindowTree is the payload returned by getTree: a synthetic root ("Desktop
// windows:") whose children are the top-level windows.
type WindowTree struct {
	Root  WindowNode `json:"root"`
	Count int        `json:"count"`
}

// ProcessInfo is the detailed per-process payload returned by getProcessInfo
// when a process-group folder is selected in the windows tree.
type ProcessInfo struct {
	Valid       bool   `json:"valid"`
	ProcessID   uint32 `json:"processId"`
	ProcessName string `json:"processName"`
	ProcessPath string `json:"processPath"`
	// CommandLine is the process PEB command line when readable; empty when
	// access is denied or the process has exited.
	CommandLine string `json:"commandLine"`
	// Bits is 32 or 64 when known, 0 when the process could not be queried.
	Bits int `json:"bits"`
	// UserName is DOMAIN\User for the process token owner when readable.
	UserName string `json:"userName"`
	// Integrity is high / medium / mediumplus / low / undetected.
	Integrity string `json:"integrity"`
}

// MonitorWindow describes one of the windows reported by the active-window
// monitor (foreground / active / focus / capture). Valid distinguishes a real
// window from the "no window" (handle 0) and "invalid window" cases, mirroring
// the legacy liswatch calcwindowtext() formatting.
type MonitorWindow struct {
	Handle    string `json:"handle"`
	ClassName string `json:"className"`
	Title     string `json:"title"`
	Valid     bool   `json:"valid"`
	// NoWindow is true when the Win32 call returned HWND 0 (e.g. no focus or
	// capture target). Distinct from Valid=false, which means a non-zero but
	// invalid/stale handle.
	NoWindow  bool   `json:"noWindow"`
	ProcessID uint32 `json:"processId"`
	ThreadID  uint32 `json:"threadId"`
}

// ActiveWindowsInfo is the payload returned by getActiveWindows: a single
// snapshot of the local input state, polled periodically by the frontend. It is
// the Go analogue of the legacy liswatch_t::on_timer() output which showed the
// Foreground, Active, Focus and Capture windows plus the attached thread.
type ActiveWindowsInfo struct {
	Foreground MonitorWindow `json:"foreground"`
	Active     MonitorWindow `json:"active"`
	Focus      MonitorWindow `json:"focus"`
	Capture    MonitorWindow `json:"capture"`
	// ThreadID is the thread that created the foreground window (the thread we
	// attach our input queue to while reading the per-thread active/focus state).
	ThreadID uint32 `json:"threadId"`
	// SystemWide is true when monitoring the whole system (following whatever
	// window is currently in the foreground) rather than a fixed thread.
	SystemWide bool `json:"systemWide"`
}

// RectInfo mirrors a Win32 RECT plus derived size, used for both the window and
// client rectangles on the General tab.
type RectInfo struct {
	Left   int32 `json:"left"`
	Top    int32 `json:"top"`
	Right  int32 `json:"right"`
	Bottom int32 `json:"bottom"`
	Width  int32 `json:"width"`
	Height int32 `json:"height"`
}

// RelatedWindow describes the parent or owner of the target window.
type RelatedWindow struct {
	Handle    string `json:"handle"`
	ClassName string `json:"className"`
}

// WindowInfo is the detailed, per-window information shown in the properties
// panel (General: Window + Process; Window Extra: Class + Style). It is the Go
// analogue of the WinSpy++ SetGeneralInfo/SetStyleInfo/SetClassInfo/SetProcessInfo
// output.
type WindowInfo struct {
	Valid bool `json:"valid"`

	// General
	Handle    string        `json:"handle"`
	Caption   string        `json:"caption"`
	ClassName string        `json:"className"`
	Unicode   bool          `json:"unicode"`
	Style     uint32        `json:"style"`
	ExStyle   uint32        `json:"exStyle"`
	Visible   bool          `json:"visible"`
	Enabled   bool          `json:"enabled"`
	Rect      RectInfo      `json:"rect"`
	ClientRect RectInfo     `json:"clientRect"`
	ControlID  int64        `json:"controlId"`
	Instance   string       `json:"instance"`
	UserData   string       `json:"userData"`
	Parent     RelatedWindow `json:"parent"`
	Owner      RelatedWindow `json:"owner"`

	// Styles (decoded human-readable flag names)
	StyleNames   []string `json:"styleNames"`
	ExStyleNames []string `json:"exStyleNames"`

	// Class
	ClassAtom       string `json:"classAtom"`
	ClassStyle      uint32 `json:"classStyle"`
	ClassExtraBytes int32  `json:"classExtraBytes"`
	WindowExtraBytes int32 `json:"windowExtraBytes"`

	// Process
	ProcessID   uint32 `json:"processId"`
	ThreadID    uint32 `json:"threadId"`
	ProcessName string `json:"processName"`
	ProcessPath string `json:"processPath"`
	// Bits is 32 or 64 when known, 0 when the process could not be queried.
	Bits int `json:"bits"`
	// UserName is DOMAIN\User for the process token owner.
	UserName string `json:"userName"`
	// Integrity is the process mandatory integrity level: high / medium /
	// mediumplus / low / undetected (same vocabulary as dpagent.IntegrityLevel).
	Integrity string `json:"integrity"`
}
