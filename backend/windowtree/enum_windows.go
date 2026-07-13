//go:build windows

package windowtree

import (
	"fmt"
	"path/filepath"
	"strconv"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32 = windows.NewLazySystemDLL("user32.dll")

	procEnumWindows              = user32.NewProc("EnumWindows")
	procGetWindow                = user32.NewProc("GetWindow")
	procGetParent                = user32.NewProc("GetParent")
	procGetWindowTextW           = user32.NewProc("GetWindowTextW")
	procGetClassNameW            = user32.NewProc("GetClassNameW")
	procGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	procGetWindowLongPtrW        = user32.NewProc("GetWindowLongPtrW")
	procGetClassLongPtrW         = user32.NewProc("GetClassLongPtrW")
	procIsWindow                 = user32.NewProc("IsWindow")
	procIsWindowVisible          = user32.NewProc("IsWindowVisible")
	procIsWindowEnabled          = user32.NewProc("IsWindowEnabled")
	procIsWindowUnicode          = user32.NewProc("IsWindowUnicode")
	procGetWindowRect            = user32.NewProc("GetWindowRect")
	procGetClientRect            = user32.NewProc("GetClientRect")
	procMapWindowPoints          = user32.NewProc("MapWindowPoints")

	procGetForegroundWindow = user32.NewProc("GetForegroundWindow")
	procGetActiveWindow     = user32.NewProc("GetActiveWindow")
	procGetFocus            = user32.NewProc("GetFocus")
	procGetCapture          = user32.NewProc("GetCapture")
	procAttachThreadInput   = user32.NewProc("AttachThreadInput")
)

const (
	gwHwndNext = 2
	gwOwner    = 4
	gwChild    = 5

	gwlStyle      = ^uintptr(15) // -16
	gwlExStyle    = ^uintptr(19) // -20
	gwlpID        = ^uintptr(11) // -12
	gwlpHInstance = ^uintptr(5)  // -6
	gwlpUserData  = ^uintptr(20) // -21

	gcwAtom       = ^uintptr(31) // -32
	gclStyle      = ^uintptr(25) // -26
	gclCbClsExtra = ^uintptr(19) // -20
	gclCbWndExtra = ^uintptr(17) // -18

	maxTreeDepth = 64
)

type winRect struct {
	Left, Top, Right, Bottom int32
}

// handleToString formats a HWND for transport/display.
func handleToString(h uintptr) string {
	return fmt.Sprintf("0x%08X", uint32(h))
}

// parseHandle turns a "0x..." (or decimal) handle string back into a HWND.
func parseHandle(s string) uintptr {
	if s == "" {
		return 0
	}
	v, err := strconv.ParseUint(s, 0, 64)
	if err != nil {
		return 0
	}
	return uintptr(v)
}

func getWindowTextStr(hwnd uintptr) string {
	buf := make([]uint16, 512)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	return windows.UTF16ToString(buf)
}

func getClassNameStr(hwnd uintptr) string {
	buf := make([]uint16, 256)
	procGetClassNameW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	return windows.UTF16ToString(buf)
}

func getWindowLong(hwnd, index uintptr) uintptr {
	r, _, _ := procGetWindowLongPtrW.Call(hwnd, index)
	return r
}

func getClassLong(hwnd, index uintptr) uintptr {
	r, _, _ := procGetClassLongPtrW.Call(hwnd, index)
	return r
}

func getThreadProcess(hwnd uintptr) (threadID, processID uint32) {
	r, _, _ := procGetWindowThreadProcessId.Call(hwnd, uintptr(unsafe.Pointer(&processID)))
	threadID = uint32(r)
	return
}

func isWindowBool(proc *windows.LazyProc, hwnd uintptr) bool {
	r, _, _ := proc.Call(hwnd)
	return r != 0
}

// buildNode reads the lightweight tree info for a single window.
func buildNode(hwnd uintptr) WindowNode {
	tid, pid := getThreadProcess(hwnd)
	return WindowNode{
		Handle:    handleToString(hwnd),
		ClassName: getClassNameStr(hwnd),
		Title:     getWindowTextStr(hwnd),
		ProcessID: pid,
		ThreadID:  tid,
		Style:     uint32(getWindowLong(hwnd, gwlStyle)),
		ExStyle:   uint32(getWindowLong(hwnd, gwlExStyle)),
		Visible:   isWindowBool(procIsWindowVisible, hwnd),
	}
}

// buildChildren walks the child windows of hwnd in z-order using
// GW_CHILD + GW_HWNDNEXT (which also covers windows that EnumChildWindows would
// return, while preserving the on-screen order).
func buildChildren(hwnd uintptr, depth int, count *int) []WindowNode {
	if depth >= maxTreeDepth {
		return nil
	}
	var children []WindowNode
	child, _, _ := procGetWindow.Call(hwnd, gwChild)
	for child != 0 {
		*count++
		node := buildNode(child)
		node.Children = buildChildren(child, depth+1, count)
		children = append(children, node)
		child, _, _ = procGetWindow.Call(child, gwHwndNext)
	}
	return children
}

func platformGetTree() (WindowTree, error) {
	count := 0
	var top []WindowNode

	cb := windows.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		count++
		node := buildNode(hwnd)
		node.Children = buildChildren(hwnd, 1, &count)
		top = append(top, node)
		return 1 // continue enumeration
	})
	procEnumWindows.Call(cb, 0)

	root := WindowNode{
		Handle:   "root",
		Title:    "Desktop windows:",
		Children: top,
	}
	return WindowTree{Root: root, Count: count}, nil
}

func rectInfo(r winRect) RectInfo {
	return RectInfo{
		Left:   r.Left,
		Top:    r.Top,
		Right:  r.Right,
		Bottom: r.Bottom,
		Width:  r.Right - r.Left,
		Height: r.Bottom - r.Top,
	}
}

func processImage(pid uint32) (name, path string) {
	if pid == 0 {
		return "", ""
	}
	const queryLimited = 0x1000
	h, err := windows.OpenProcess(queryLimited, false, pid)
	if err != nil {
		return "", ""
	}
	defer windows.CloseHandle(h)

	buf := make([]uint16, windows.MAX_PATH)
	size := uint32(len(buf))
	if err := windows.QueryFullProcessImageName(h, 0, &buf[0], &size); err != nil {
		return "", ""
	}
	path = windows.UTF16ToString(buf[:size])
	name = filepath.Base(path)
	return name, path
}

func platformGetWindowInfo(handle string) (WindowInfo, error) {
	hwnd := parseHandle(handle)

	info := WindowInfo{Handle: handleToString(hwnd)}
	if hwnd == 0 || !isWindowBool(procIsWindow, hwnd) {
		return info, nil
	}
	info.Valid = true

	info.Caption = getWindowTextStr(hwnd)
	info.ClassName = getClassNameStr(hwnd)
	info.Unicode = isWindowBool(procIsWindowUnicode, hwnd)
	info.Style = uint32(getWindowLong(hwnd, gwlStyle))
	info.ExStyle = uint32(getWindowLong(hwnd, gwlExStyle))
	info.Visible = isWindowBool(procIsWindowVisible, hwnd)
	info.Enabled = isWindowBool(procIsWindowEnabled, hwnd)

	info.StyleNames = decodeStyle(info.Style)
	info.ExStyleNames = decodeExStyle(info.ExStyle)

	// Window rectangle (screen coords).
	var wr winRect
	procGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&wr)))
	info.Rect = rectInfo(wr)

	// Client rectangle mapped to screen coords, then offset like WinSpy++.
	var cr winRect
	procGetClientRect.Call(hwnd, uintptr(unsafe.Pointer(&cr)))
	procMapWindowPoints.Call(hwnd, 0, uintptr(unsafe.Pointer(&cr)), 2)
	info.ClientRect = rectInfo(cr)

	info.ControlID = int64(int32(getWindowLong(hwnd, gwlpID)))
	info.Instance = handleToString(getWindowLong(hwnd, gwlpHInstance))
	info.UserData = handleToString(getWindowLong(hwnd, gwlpUserData))

	parent, _, _ := procGetParent.Call(hwnd)
	owner, _, _ := procGetWindow.Call(hwnd, gwOwner)
	info.Parent = RelatedWindow{Handle: handleToString(parent), ClassName: classNameOrEmpty(parent)}
	info.Owner = RelatedWindow{Handle: handleToString(owner), ClassName: classNameOrEmpty(owner)}

	// Class info.
	info.ClassAtom = fmt.Sprintf("0x%04X", uint16(getClassLong(hwnd, gcwAtom)))
	info.ClassStyle = uint32(getClassLong(hwnd, gclStyle))
	info.ClassExtraBytes = int32(getClassLong(hwnd, gclCbClsExtra))
	info.WindowExtraBytes = int32(getClassLong(hwnd, gclCbWndExtra))

	// Process info.
	info.ThreadID, info.ProcessID = getThreadProcess(hwnd)
	info.ProcessName, info.ProcessPath = processImage(info.ProcessID)

	return info, nil
}

func classNameOrEmpty(hwnd uintptr) string {
	if hwnd == 0 {
		return ""
	}
	return getClassNameStr(hwnd)
}

// ------------------------------------------------------------
// Active Windows Monitor

// platformGetActiveWindows returns a snapshot of the local input state. This is
// the Go port of liswatch_t::on_timer(): GetActiveWindow/GetFocus/GetCapture
// return state from the *calling* thread's input queue, so to observe another
// application we temporarily AttachThreadInput to the thread that owns the
// current foreground window, read the values, then detach.
func platformGetActiveWindows() (ActiveWindowsInfo, error) {
	fg, _, _ := procGetForegroundWindow.Call()

	current := uintptr(windows.GetCurrentThreadId())

	var fgThread uint32
	if fg != 0 {
		fgThread, _ = getThreadProcess(fg)
	}

	attached := false
	if fgThread != 0 && uintptr(fgThread) != current {
		r, _, _ := procAttachThreadInput.Call(current, uintptr(fgThread), 1)
		attached = r != 0
	}

	active, _, _ := procGetActiveWindow.Call()
	focus, _, _ := procGetFocus.Call()
	capture, _, _ := procGetCapture.Call()

	if attached {
		procAttachThreadInput.Call(current, uintptr(fgThread), 0)
	}

	return ActiveWindowsInfo{
		Foreground: calcMonitorWindow(fg),
		Active:     calcMonitorWindow(active),
		Focus:      calcMonitorWindow(focus),
		Capture:    calcMonitorWindow(capture),
		ThreadID:   fgThread,
		SystemWide: true,
	}, nil
}

// calcMonitorWindow reads the display info for one monitored window, splitting
// out the "no window" (handle 0) and "invalid window" cases the same way the
// legacy liswatch calcwindowtext() did.
func calcMonitorWindow(hwnd uintptr) MonitorWindow {
	if hwnd == 0 {
		return MonitorWindow{Handle: handleToString(0), NoWindow: true}
	}
	if !isWindowBool(procIsWindow, hwnd) {
		return MonitorWindow{Handle: handleToString(hwnd)}
	}
	tid, pid := getThreadProcess(hwnd)
	return MonitorWindow{
		Handle:    handleToString(hwnd),
		ClassName: getClassNameStr(hwnd),
		Title:     getWindowTextStr(hwnd),
		Valid:     true,
		ProcessID: pid,
		ThreadID:  tid,
	}
}
