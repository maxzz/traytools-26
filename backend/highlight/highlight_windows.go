//go:build windows

package highlight

import (
	"runtime"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32   = windows.NewLazySystemDLL("user32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")
	gdi32    = windows.NewLazySystemDLL("gdi32.dll")

	procRegisterClassExW = user32.NewProc("RegisterClassExW")
	procCreateWindowExW  = user32.NewProc("CreateWindowExW")
	procDefWindowProcW   = user32.NewProc("DefWindowProcW")
	procShowWindow       = user32.NewProc("ShowWindow")
	procGetMessageW      = user32.NewProc("GetMessageW")
	procTranslateMessage = user32.NewProc("TranslateMessage")
	procDispatchMessageW = user32.NewProc("DispatchMessageW")
	procPostMessageW     = user32.NewProc("PostMessageW")
	procPostQuitMessage  = user32.NewProc("PostQuitMessage")
	procSetTimer         = user32.NewProc("SetTimer")
	procKillTimer        = user32.NewProc("KillTimer")
	procUpdateLayeredWin = user32.NewProc("UpdateLayeredWindow")
	procFillRect         = user32.NewProc("FillRect")
	procGetDC            = user32.NewProc("GetDC")
	procReleaseDC        = user32.NewProc("ReleaseDC")
	procIsWindowVisible  = user32.NewProc("IsWindowVisible")
	procGetSystemMetrics = user32.NewProc("GetSystemMetrics")

	procCreateCompatibleDC     = gdi32.NewProc("CreateCompatibleDC")
	procCreateCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
	procSelectObject           = gdi32.NewProc("SelectObject")
	procCreateSolidBrush       = gdi32.NewProc("CreateSolidBrush")
	procDeleteObject           = gdi32.NewProc("DeleteObject")
	procDeleteDC               = gdi32.NewProc("DeleteDC")

	procGetModuleHandleW = kernel32.NewProc("GetModuleHandleW")
)

const (
	wmClose = 0x0010
	wmTimer = 0x0113
	wmUser  = 0x0400

	wmHighlight = wmUser + 100
	wmHide      = wmUser + 101

	wsPopup        = 0x80000000
	wsExTopmost    = 0x00000008
	wsExLayered    = 0x00080000
	wsExToolWindow = 0x00000080
	wsExNoActivate = 0x08000000
	wsExTransp     = 0x00000020

	swHide   = 0
	swShowNA = 8

	ulwColorKey = 0x00000001

	flashIntervalMS = 200
)

type hwnd uintptr

type rect struct {
	Left, Top, Right, Bottom int32
}

type point struct{ X, Y int32 }
type size struct{ Cx, Cy int32 }

type msg struct {
	hwnd    uintptr
	message uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	pt      point
}

type wndClassExW struct {
	cbSize        uint32
	style         uint32
	lpfnWndProc   uintptr
	cbClsExtra    int32
	cbWndExtra    int32
	hInstance     uintptr
	hIcon         uintptr
	hCursor       uintptr
	hbrBackground uintptr
	lpszMenuName  *uint16
	lpszClassName *uint16
	hIconSm       uintptr
}

// Highlighter owns a single layered overlay window running on a dedicated,
// OS-locked goroutine with its own message loop.
type Highlighter struct {
	className *uint16

	mu          sync.Mutex
	hwnd        hwnd
	pending     HighlightParams
	initialized bool

	timerID        uintptr
	remainingBlink int
}

var activeHighlighter *Highlighter

func newHighlighter() platformHighlighter {
	return NewHighlighter()
}

// NewHighlighter creates and starts the overlay window. It blocks until the
// window exists.
func NewHighlighter() *Highlighter {
	h := &Highlighter{className: windows.StringToUTF16Ptr("TrayToolsHighlighterWindow")}
	activeHighlighter = h

	ready := make(chan struct{})
	go h.runMessageLoop(ready)
	<-ready
	return h
}

func (h *Highlighter) runMessageLoop(ready chan struct{}) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	wc := wndClassExW{
		lpfnWndProc:   windows.NewCallback(wndProc),
		hInstance:     getModuleHandle(),
		lpszClassName: h.className,
	}
	wc.cbSize = uint32(unsafe.Sizeof(wc))
	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	created, _, _ := procCreateWindowExW.Call(
		wsExTopmost|wsExLayered|wsExToolWindow|wsExNoActivate|wsExTransp,
		uintptr(unsafe.Pointer(h.className)),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(""))),
		wsPopup,
		0, 0, 0, 0,
		0, 0, getModuleHandle(), 0,
	)
	h.hwnd = hwnd(created)
	h.initialized = created != 0
	close(ready)
	if created == 0 {
		return
	}

	var m msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
	}
}

func wndProc(window uintptr, message uint32, wParam, lParam uintptr) uintptr {
	h := activeHighlighter
	if h == nil {
		ret, _, _ := procDefWindowProcW.Call(window, uintptr(message), wParam, lParam)
		return ret
	}
	switch message {
	case wmHighlight:
		h.mu.Lock()
		params := h.pending
		h.mu.Unlock()
		h.onHighlight(params)
		return 0
	case wmHide:
		h.onHide()
		return 0
	case wmTimer:
		h.onTimer()
		return 0
	case wmClose:
		procPostQuitMessage.Call(0)
		return 0
	}
	ret, _, _ := procDefWindowProcW.Call(window, uintptr(message), wParam, lParam)
	return ret
}

// Highlight asynchronously shows/blinks a rectangle.
func (h *Highlighter) Highlight(p HighlightParams) {
	if !h.initialized || h.hwnd == 0 {
		return
	}
	h.mu.Lock()
	h.pending = p
	h.mu.Unlock()
	procPostMessageW.Call(uintptr(h.hwnd), wmHighlight, 0, 0)
}

// Hide hides the overlay.
func (h *Highlighter) Hide() {
	if !h.initialized || h.hwnd == 0 {
		return
	}
	procPostMessageW.Call(uintptr(h.hwnd), wmHide, 0, 0)
}

func (h *Highlighter) onHighlight(p HighlightParams) {
	if h.timerID != 0 {
		procKillTimer.Call(uintptr(h.hwnd), h.timerID)
		h.timerID = 0
	}
	h.updateWindow(p)
	procShowWindow.Call(uintptr(h.hwnd), swShowNA)

	if p.BlinkCount > 0 {
		h.remainingBlink = p.BlinkCount*2 - 1
		ret, _, _ := procSetTimer.Call(uintptr(h.hwnd), 1, flashIntervalMS, 0)
		h.timerID = ret
	}
}

func (h *Highlighter) onHide() {
	if h.timerID != 0 {
		procKillTimer.Call(uintptr(h.hwnd), h.timerID)
		h.timerID = 0
	}
	procShowWindow.Call(uintptr(h.hwnd), swHide)
}

func (h *Highlighter) onTimer() {
	if h.remainingBlink <= 0 {
		procKillTimer.Call(uintptr(h.hwnd), h.timerID)
		h.timerID = 0
		procShowWindow.Call(uintptr(h.hwnd), swHide)
		return
	}
	h.remainingBlink--
	if isWindowVisible(h.hwnd) {
		procShowWindow.Call(uintptr(h.hwnd), swHide)
	} else {
		procShowWindow.Call(uintptr(h.hwnd), swShowNA)
	}
}

func rgbToColorRef(rgb int) uint32 {
	r := uint32((rgb >> 16) & 0xFF)
	g := uint32((rgb >> 8) & 0xFF)
	b := uint32(rgb & 0xFF)
	return r | (g << 8) | (b << 16)
}

func (h *Highlighter) updateWindow(p HighlightParams) {
	width := p.Right - p.Left
	height := p.Bottom - p.Top
	if width <= 0 || height <= 0 {
		procShowWindow.Call(uintptr(h.hwnd), swHide)
		return
	}

	borderColor := rgbToColorRef(0xFF0000)
	if p.ColorRGB != 0 {
		borderColor = rgbToColorRef(p.ColorRGB)
	}
	transparent := rgbToColorRef(0x008080) // RGB(0,128,128)

	borderWidth := p.BorderWidth
	if borderWidth <= 0 {
		borderWidth = 5
	}
	maxX := width / 2
	maxY := height / 2
	thickness := borderWidth
	if thickness > maxX {
		thickness = maxX
	}
	if thickness > maxY {
		thickness = maxY
	}
	if thickness <= 0 {
		procShowWindow.Call(uintptr(h.hwnd), swHide)
		return
	}

	hdcScreen, _, _ := procGetDC.Call(0)
	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	hBitmap, _, _ := procCreateCompatibleBitmap.Call(hdcScreen, uintptr(width), uintptr(height))
	hOld, _, _ := procSelectObject.Call(hdcMem, hBitmap)

	brushTransparent, _, _ := procCreateSolidBrush.Call(uintptr(transparent))
	fill := func(l, t, r, b int32, brush uintptr) {
		rc := rect{Left: l, Top: t, Right: r, Bottom: b}
		procFillRect.Call(hdcMem, uintptr(unsafe.Pointer(&rc)), brush)
	}
	fill(0, 0, int32(width), int32(height), brushTransparent)

	brushBorder, _, _ := procCreateSolidBrush.Call(uintptr(borderColor))
	tk := int32(thickness)
	w := int32(width)
	ht := int32(height)
	fill(0, 0, w, tk, brushBorder)        // top
	fill(0, ht-tk, w, ht, brushBorder)    // bottom
	fill(0, tk, tk, ht-tk, brushBorder)   // left
	fill(w-tk, tk, w, ht-tk, brushBorder) // right

	procDeleteObject.Call(brushBorder)
	procDeleteObject.Call(brushTransparent)

	ptPos := point{X: int32(p.Left), Y: int32(p.Top)}
	szWnd := size{Cx: int32(width), Cy: int32(height)}
	ptSrc := point{X: 0, Y: 0}

	procUpdateLayeredWin.Call(
		uintptr(h.hwnd),
		hdcScreen,
		uintptr(unsafe.Pointer(&ptPos)),
		uintptr(unsafe.Pointer(&szWnd)),
		hdcMem,
		uintptr(unsafe.Pointer(&ptSrc)),
		uintptr(transparent),
		0,
		ulwColorKey,
	)

	procSelectObject.Call(hdcMem, hOld)
	procDeleteObject.Call(hBitmap)
	procDeleteDC.Call(hdcMem)
	procReleaseDC.Call(0, hdcScreen)
}

func getModuleHandle() uintptr {
	ret, _, _ := procGetModuleHandleW.Call(0)
	return ret
}

func isWindowVisible(h hwnd) bool {
	ret, _, _ := procIsWindowVisible.Call(uintptr(h))
	return ret != 0
}
