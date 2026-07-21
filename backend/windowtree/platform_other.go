//go:build !windows

package windowtree

// Non-Windows fallback. There is no Win32 window manager to enumerate, so a
// small synthetic tree is returned to keep the UI fully exercisable on any
// platform.

func platformGetTree() (WindowTree, error) {
	root := WindowNode{
		Handle: "root",
		Title:  "Desktop windows:",
		Children: []WindowNode{
			{
				Handle:      "0x00010001",
				ClassName:   "DemoTopLevel",
				Title:       "Sample Window (non-Windows demo)",
				ProcessID:   1234,
				ThreadID:    10,
				ProcessName: "demo.exe",
				Style:       wsVisible | wsCaption(),
				Visible:     true,
				Children: []WindowNode{
					{Handle: "0x00010002", ClassName: "Button", Title: "OK", ProcessID: 1234, ThreadID: 10, ProcessName: "demo.exe", Style: wsVisible | wsChild, Visible: true},
					{Handle: "0x00010003", ClassName: "Edit", Title: "", ProcessID: 1234, ThreadID: 10, ProcessName: "demo.exe", Style: wsVisible | wsChild, Visible: true},
				},
			},
			{
				Handle:      "0x00020001",
				ClassName:   "OtherTopLevel",
				Title:       "Another Process Window",
				ProcessID:   5678,
				ThreadID:    20,
				ProcessName: "other.exe",
				Style:       wsVisible | wsCaption(),
				Visible:     true,
			},
		},
	}
	return WindowTree{Root: root, Count: 4}, nil
}

func wsCaption() uint32 { return wsBorder | wsDlgFrame | wsSysMenu }

// platformGetActiveWindows returns a small synthetic snapshot so the active
// monitor tab stays exercisable on non-Windows platforms.
func platformGetActiveWindows() (ActiveWindowsInfo, error) {
	sample := MonitorWindow{
		Handle:    "0x00010001",
		ClassName: "DemoTopLevel",
		Title:     "Sample Window (non-Windows demo)",
		Valid:     true,
		ProcessID: 1234,
		ThreadID:  10,
	}
	return ActiveWindowsInfo{
		Foreground: sample,
		Active:     sample,
		Focus:      MonitorWindow{Handle: "0x00000000", NoWindow: true},
		Capture:    MonitorWindow{Handle: "0x00000000", NoWindow: true},
		ThreadID:   10,
		SystemWide: true,
	}, nil
}

func platformGetWindowInfo(handle string) (WindowInfo, error) {
	if handle == "" || handle == "root" {
		return WindowInfo{Handle: handle}, nil
	}
	style := uint32(wsVisible | wsChild)
	return WindowInfo{
		Valid:        true,
		Handle:       handle,
		Caption:      "Sample Window (non-Windows demo)",
		ClassName:    "DemoClass",
		Unicode:      true,
		Style:        style,
		ExStyle:      0,
		Visible:      true,
		Enabled:      true,
		Rect:         RectInfo{Left: 100, Top: 100, Right: 700, Bottom: 500, Width: 600, Height: 400},
		ClientRect:   RectInfo{Left: 104, Top: 130, Right: 696, Bottom: 496, Width: 592, Height: 366},
		ControlID:    0,
		Instance:     "0x00400000",
		UserData:     "0",
		Parent:       RelatedWindow{Handle: "0", ClassName: ""},
		Owner:        RelatedWindow{Handle: "0", ClassName: ""},
		StyleNames:   decodeStyle(style),
		ExStyleNames: decodeExStyle(0),
		ClassAtom:    "0xC001",
		ClassStyle:   0,
		ProcessID:    1234,
		ThreadID:     10,
		ProcessName:  "demo",
		ProcessPath:  "/usr/bin/demo",
		Bits:         64,
		UserName:     "DEMO\\user",
		Integrity:    "medium",
	}, nil
}
