package windowtree

// Style/exStyle decoding into human-readable flag names for the Styles tab.
// Only the generic window styles (high word) are decoded; class-specific low
// bits (button/edit/listbox/... styles) are left out, matching what a
// class-agnostic view can reliably report.

type styleFlag struct {
	bit  uint32
	name string
}

const (
	wsPopup       = 0x80000000
	wsChild       = 0x40000000
	wsMinimize    = 0x20000000
	wsVisible     = 0x10000000
	wsDisabled    = 0x08000000
	wsClipSibl    = 0x04000000
	wsClipChild   = 0x02000000
	wsMaximize    = 0x01000000
	wsBorder      = 0x00800000
	wsDlgFrame    = 0x00400000
	wsVScroll     = 0x00200000
	wsHScroll     = 0x00100000
	wsSysMenu     = 0x00080000
	wsThickFrame  = 0x00040000
	wsGroup       = 0x00020000
	wsTabStop     = 0x00010000
)

var windowStyleFlags = []styleFlag{
	{wsPopup, "WS_POPUP"},
	{wsChild, "WS_CHILD"},
	{wsMinimize, "WS_MINIMIZE"},
	{wsVisible, "WS_VISIBLE"},
	{wsDisabled, "WS_DISABLED"},
	{wsClipSibl, "WS_CLIPSIBLINGS"},
	{wsClipChild, "WS_CLIPCHILDREN"},
	{wsMaximize, "WS_MAXIMIZE"},
	{wsBorder, "WS_BORDER"},
	{wsDlgFrame, "WS_DLGFRAME"},
	{wsVScroll, "WS_VSCROLL"},
	{wsHScroll, "WS_HSCROLL"},
	{wsSysMenu, "WS_SYSMENU"},
	{wsThickFrame, "WS_THICKFRAME"},
	{wsGroup, "WS_GROUP"},
	{wsTabStop, "WS_TABSTOP"},
}

var windowExStyleFlags = []styleFlag{
	{0x00000001, "WS_EX_DLGMODALFRAME"},
	{0x00000004, "WS_EX_NOPARENTNOTIFY"},
	{0x00000008, "WS_EX_TOPMOST"},
	{0x00000010, "WS_EX_ACCEPTFILES"},
	{0x00000020, "WS_EX_TRANSPARENT"},
	{0x00000040, "WS_EX_MDICHILD"},
	{0x00000080, "WS_EX_TOOLWINDOW"},
	{0x00000100, "WS_EX_WINDOWEDGE"},
	{0x00000200, "WS_EX_CLIENTEDGE"},
	{0x00000400, "WS_EX_CONTEXTHELP"},
	{0x00001000, "WS_EX_RIGHT"},
	{0x00002000, "WS_EX_RTLREADING"},
	{0x00004000, "WS_EX_LEFTSCROLLBAR"},
	{0x00010000, "WS_EX_CONTROLPARENT"},
	{0x00020000, "WS_EX_STATICEDGE"},
	{0x00040000, "WS_EX_APPWINDOW"},
	{0x00080000, "WS_EX_LAYERED"},
	{0x00100000, "WS_EX_NOINHERITLAYOUT"},
	{0x00400000, "WS_EX_LAYOUTRTL"},
	{0x02000000, "WS_EX_COMPOSITED"},
	{0x08000000, "WS_EX_NOACTIVATE"},
}

func decodeFlags(value uint32, flags []styleFlag) []string {
	var names []string
	// WS_CAPTION is WS_BORDER | WS_DLGFRAME; report it explicitly when both set.
	if flags == nil {
		return names
	}
	for _, f := range flags {
		if value&f.bit == f.bit {
			names = append(names, f.name)
		}
	}
	return names
}

func decodeStyle(style uint32) []string {
	names := decodeFlags(style, windowStyleFlags)
	if style&(wsBorder|wsDlgFrame) == (wsBorder | wsDlgFrame) {
		names = append([]string{"WS_CAPTION"}, names...)
	}
	return names
}

func decodeExStyle(exStyle uint32) []string {
	return decodeFlags(exStyle, windowExStyleFlags)
}
