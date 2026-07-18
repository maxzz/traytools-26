package highlight

// Bus group shared with the frontend bridge (groups/highlight.ts).
const Group = "highlight"

// HighlightRectRequest is the JSON payload for highlightRect.
type HighlightRectRequest struct {
	Left        int `json:"left"`
	Top         int `json:"top"`
	Right       int `json:"right"`
	Bottom      int `json:"bottom"`
	Color       int `json:"color"`       // RGB 0xRRGGBB; 0 means default red
	BorderWidth int `json:"borderWidth"` // pixels; <=0 uses native default
	BlinkCount  int `json:"blinkCount"`
}

// BoundsRect is a screen rectangle used by classifyBounds.
type BoundsRect struct {
	Left   int `json:"left"`
	Top    int `json:"top"`
	Right  int `json:"right"`
	Bottom int `json:"bottom"`
}

// BoundsClassification is returned by classifyBounds.
// Kind is one of: "ok", "empty", "offscreen".
type BoundsClassification struct {
	Kind string `json:"kind"`
}

// HighlightParams describes a rectangle to outline on screen. Colors are
// supplied as RGB (0xRRGGBB) and converted to the Win32 BGR COLORREF.
type HighlightParams struct {
	Left, Top, Right, Bottom int
	ColorRGB                 int
	BorderWidth              int
	BlinkCount               int
}
