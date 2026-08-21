//go:build windows

package winpicker

import (
	"image"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
	"traytools-26-go/backend/winpicker/win32"
)

var (
	procRegisterClassExW             = user32.NewProc("RegisterClassExW")
	procCreateWindowExW              = user32.NewProc("CreateWindowExW")
	procDestroyWindow                = user32.NewProc("DestroyWindow")
	procShowWindow                   = user32.NewProc("ShowWindow")
	procSetWindowPos                 = user32.NewProc("SetWindowPos")
	procDefWindowProcW               = user32.NewProc("DefWindowProcW")
	procUpdateLayeredWindow          = user32.NewProc("UpdateLayeredWindow")
	procCreateCompatibleDC           = gdi32.NewProc("CreateCompatibleDC")
	procSelectObject                 = gdi32.NewProc("SelectObject")
	procDeleteDC                     = gdi32.NewProc("DeleteDC")
	procShowCursor                   = user32.NewProc("ShowCursor")
	procSetCursor                    = user32.NewProc("SetCursor")
	procSetClassLongPtrW             = user32.NewProc("SetClassLongPtrW")
	procSetThreadDpiAwarenessContext = user32.NewProc("SetThreadDpiAwarenessContext")
)

const (
	wsPopup        = 0x80000000
	wsExTopmost    = 0x00000008
	wsExLayered    = 0x00080000
	wsExToolWindow = 0x00000080
	wsExNoActivate = 0x08000000
	wsExTransp     = 0x00000020

	swHide   = 0
	swShowNA = 8

	swpNosize     = 0x0001
	swpNozorder   = 0x0004
	swpNoactivate = 0x0010

	acSrcOver  = 0x00
	acSrcAlpha = 0x01
	ulwAlpha   = 0x00000002

	wmSetCursor = 0x0020

	// DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
	dpiContextPerMonitorV2 = ^uintptr(3)
)

type overlayPoint struct{ X, Y int32 }
type overlaySize struct{ Cx, Cy int32 }

type overlayWndClassExW struct {
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

type blendFunction struct {
	BlendOp             byte
	BlendFlags          byte
	SourceConstantAlpha byte
	AlphaFormat         byte
}

var (
	overlayClassName = windows.StringToUTF16Ptr("TrayToolsPickerOverlay")
	overlayProcAddr  = windows.NewCallback(overlayWndProc)
	overlayClassOnce sync.Once
)

func lockPickerThreadDpi() {
	if procSetThreadDpiAwarenessContext.Find() != nil {
		return
	}
	procSetThreadDpiAwarenessContext.Call(dpiContextPerMonitorV2)
}

func overlayWndProc(hwnd, message, wParam, lParam uintptr) uintptr {
	if message == wmSetCursor {
		s := activeSession
		if s != nil && s.iconMode.overlayShowsPointer() {
			procSetCursor.Call(loadArrowCursor())
		} else {
			procSetCursor.Call(0)
		}
		return 1
	}
	ret, _, _ := procDefWindowProcW.Call(hwnd, message, wParam, lParam)
	return ret
}

func registerOverlayClass() {
	overlayClassOnce.Do(func() {
		wc := overlayWndClassExW{
			lpfnWndProc:   overlayProcAddr,
			hInstance:     win32.GetModuleHandle(),
			lpszClassName: overlayClassName,
		}
		wc.cbSize = uint32(unsafe.Sizeof(wc))
		procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
	})
}

func (s *Session) installDragIcon() {
	if s.iconMode.usesLayeredOverlay() && s.createOverlay() {
		s.applyOverlayClassCursor()
		if !s.iconMode.overlayShowsPointer() {
			s.hideSystemCursor()
		}
		return
	}
	s.installCursor()
}

func (s *Session) applyOverlayClassCursor() {
	if s.overlayHwnd == 0 {
		return
	}
	var h uintptr
	if s.iconMode.overlayShowsPointer() {
		h = loadArrowCursor()
	}
	procSetClassLongPtrW.Call(s.overlayHwnd, ^uintptr(11), h) // GCLP_HCURSOR = -12
}

func (s *Session) restoreDragIcon() {
	s.destroyOverlay()
	s.showSystemCursor()
	s.restoreCursors()
}

func (s *Session) hideSystemCursor() {
	if s.cursorHidden {
		return
	}
	procShowCursor.Call(0)
	s.cursorHidden = true
}

func (s *Session) showSystemCursor() {
	if !s.cursorHidden {
		return
	}
	procShowCursor.Call(1)
	s.cursorHidden = false
}

func (s *Session) createOverlay() bool {
	lockPickerThreadDpi()
	img, err := decodePNGNative(targetPNG)
	if err != nil || img == nil {
		return false
	}
	width, height := img.Bounds().Dx(), img.Bounds().Dy()
	if width < 1 || height < 1 {
		return false
	}

	registerOverlayClass()

	pt, _ := win32.GetCursorPos()
	halfW := int32(width / 2)
	halfH := int32(height / 2)
	x := pt.X - halfW
	y := pt.Y - halfH

	hwnd, _, _ := procCreateWindowExW.Call(
		wsExTopmost|wsExLayered|wsExToolWindow|wsExNoActivate|wsExTransp,
		uintptr(unsafe.Pointer(overlayClassName)),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(""))),
		wsPopup,
		uintptr(uint32(x)),
		uintptr(uint32(y)),
		uintptr(width),
		uintptr(height),
		0, 0, win32.GetModuleHandle(), 0,
	)
	if hwnd == 0 {
		return false
	}

	if !paintOverlayAlpha(hwnd, img, x, y) {
		procDestroyWindow.Call(hwnd)
		return false
	}

	procShowWindow.Call(hwnd, swShowNA)
	s.overlayHwnd = hwnd
	s.overlayHalfW = halfW
	s.overlayHalfH = halfH
	return true
}

func paintOverlayAlpha(hwnd uintptr, img *image.NRGBA, x, y int32) bool {
	width, height, bgra := nrgbaToPremulBGRA(img)
	hdcScreen, _, _ := procGetDC.Call(0)
	if hdcScreen == 0 {
		return false
	}
	defer procReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	if hdcMem == 0 {
		return false
	}
	defer procDeleteDC.Call(hdcMem)

	header := bitmapInfoHeader{
		Size:        uint32(unsafe.Sizeof(bitmapInfoHeader{})),
		Width:       int32(width),
		Height:      -int32(height),
		Planes:      1,
		BitCount:    32,
		Compression: biRGB,
		SizeImage:   uint32(len(bgra)),
	}

	var bits unsafe.Pointer
	hbm, _, _ := procCreateDIBSection.Call(
		hdcMem,
		uintptr(unsafe.Pointer(&header)),
		dibRGBColors,
		uintptr(unsafe.Pointer(&bits)),
		0, 0,
	)
	if hbm == 0 || bits == nil {
		return false
	}
	defer procDeleteObject.Call(hbm)

	copy(unsafe.Slice((*byte)(bits), len(bgra)), bgra)

	old, _, _ := procSelectObject.Call(hdcMem, hbm)
	blend := blendFunction{
		BlendOp:             acSrcOver,
		SourceConstantAlpha: 255,
		AlphaFormat:         acSrcAlpha,
	}
	ptPos := overlayPoint{X: x, Y: y}
	sz := overlaySize{Cx: int32(width), Cy: int32(height)}
	ptSrc := overlayPoint{}
	ret, _, _ := procUpdateLayeredWindow.Call(
		hwnd,
		hdcScreen,
		uintptr(unsafe.Pointer(&ptPos)),
		uintptr(unsafe.Pointer(&sz)),
		hdcMem,
		uintptr(unsafe.Pointer(&ptSrc)),
		0,
		uintptr(unsafe.Pointer(&blend)),
		ulwAlpha,
	)
	procSelectObject.Call(hdcMem, old)
	return ret != 0
}

func (s *Session) moveOverlay() {
	pt, ok := win32.GetCursorPos()
	if !ok {
		return
	}
	s.moveOverlayTo(pt)
}

func (s *Session) moveOverlayTo(pt win32.Point) {
	if s.overlayHwnd == 0 {
		return
	}
	if !s.iconMode.overlayShowsPointer() {
		procSetCursor.Call(0)
	}
	x := pt.X - s.overlayHalfW
	y := pt.Y - s.overlayHalfH
	ptPos := overlayPoint{X: x, Y: y}
	// Position-only UpdateLayeredWindow keeps the bitmap in the DWM path
	// (SetWindowPos on a layered window can trail the hardware cursor).
	ret, _, _ := procUpdateLayeredWindow.Call(
		s.overlayHwnd,
		0,
		uintptr(unsafe.Pointer(&ptPos)),
		0, 0, 0, 0, 0, 0,
	)
	if ret != 0 {
		return
	}
	procSetWindowPos.Call(
		s.overlayHwnd,
		0,
		uintptr(uint32(x)),
		uintptr(uint32(y)),
		0, 0,
		swpNosize|swpNozorder|swpNoactivate,
	)
}

func (s *Session) destroyOverlay() {
	if s.overlayHwnd == 0 {
		return
	}
	procShowWindow.Call(s.overlayHwnd, swHide)
	procDestroyWindow.Call(s.overlayHwnd)
	s.overlayHwnd = 0
}
