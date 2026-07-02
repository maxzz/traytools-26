package windowtree

// Bus group shared with the frontend bridge (groups/windowtree.ts).
const Group = "windowtree"

// WindowNode is one entry in the desktop window tree. It carries just enough
// information for the frontend to render the tree and pick an icon; the full
// per-window details are fetched lazily via getWindowInfo when a node is
// selected. Handles are serialized as strings because a HWND can exceed the
// range JavaScript numbers represent exactly on 64-bit builds.
type WindowNode struct {
	Handle    string       `json:"handle"`
	ClassName string       `json:"className"`
	Title     string       `json:"title"`
	ProcessID uint32       `json:"processId"`
	ThreadID  uint32       `json:"threadId"`
	Style     uint32       `json:"style"`
	ExStyle   uint32       `json:"exStyle"`
	Visible   bool         `json:"visible"`
	Children  []WindowNode `json:"children,omitempty"`
}

// WindowTree is the payload returned by getTree: a synthetic root ("Desktop
// windows:") whose children are the top-level windows.
type WindowTree struct {
	Root  WindowNode `json:"root"`
	Count int        `json:"count"`
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
// panel (General / Styles / Class / Process tabs). It is the Go analogue of the
// WinSpy++ SetGeneralInfo/SetStyleInfo/SetClassInfo/SetProcessInfo output.
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
}
