//go:build windows

package winpicker

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	gdi32  = windows.NewLazySystemDLL("gdi32.dll")
	user32 = windows.NewLazySystemDLL("user32.dll")

	procCreateDIBSection      = gdi32.NewProc("CreateDIBSection")
	procCreateBitmap          = gdi32.NewProc("CreateBitmap")
	procDeleteObject          = gdi32.NewProc("DeleteObject")
	procGetDC                 = user32.NewProc("GetDC")
	procReleaseDC             = user32.NewProc("ReleaseDC")
	procCreateIconIndirect    = user32.NewProc("CreateIconIndirect")
	procCopyIcon              = user32.NewProc("CopyIcon")
	procDestroyIcon           = user32.NewProc("DestroyIcon")
	procSetSystemCursor       = user32.NewProc("SetSystemCursor")
	procSystemParametersInfoW = user32.NewProc("SystemParametersInfoW")
	procGetSystemMetrics      = user32.NewProc("GetSystemMetrics")
	procLoadCursorW           = user32.NewProc("LoadCursorW")
)

const (
	smCxCursor    = 13
	dibRGBColors  = 0
	spiSetCursors = 0x0057
	idcArrow      = 32512
	idcCross      = 32515
	biRGB         = 0
)

// OCR_* ids replaced while picking so hover over text/links stays a target.
var systemCursorIDs = []uintptr{
	32512, // OCR_NORMAL
	32513, // OCR_IBEAM
	32514, // OCR_WAIT
	32515, // OCR_CROSS
	32516, // OCR_UP
	32642, // OCR_SIZENWSE
	32643, // OCR_SIZENESW
	32644, // OCR_SIZEWE
	32645, // OCR_SIZENS
	32646, // OCR_SIZEALL
	32648, // OCR_NO
	32649, // OCR_HAND
	32650, // OCR_APPSTARTING
	32651, // OCR_HELP
}

type bitmapInfoHeader struct {
	Size          uint32
	Width         int32
	Height        int32
	Planes        uint16
	BitCount      uint16
	Compression   uint32
	SizeImage     uint32
	XPelsPerMeter int32
	YPelsPerMeter int32
	ClrUsed       uint32
	ClrImportant  uint32
}

type iconInfo struct {
	fIcon    int32
	xHotspot uint32
	yHotspot uint32
	hbmMask  uintptr
	hbmColor uintptr
}

func cursorPixelSize() int {
	size, _, _ := procGetSystemMetrics.Call(smCxCursor)
	n := int(size)
	if n < 24 {
		return 32
	}
	if n > 64 {
		return 64
	}
	return n
}

func createCursorFromPNG(pngBytes []byte) uintptr {
	size := cursorPixelSize()
	img, err := decodeTargetNRGBA(pngBytes, size)
	if err != nil || img == nil {
		return 0
	}

	hdc, _, _ := procGetDC.Call(0)
	if hdc == 0 {
		return 0
	}
	defer procReleaseDC.Call(0, hdc)

	header := bitmapInfoHeader{
		Size:        uint32(unsafe.Sizeof(bitmapInfoHeader{})),
		Width:       int32(size),
		Height:      -int32(size), // top-down
		Planes:      1,
		BitCount:    32,
		Compression: biRGB,
		SizeImage:   uint32(size * size * 4),
	}

	var bits unsafe.Pointer
	hbmColor, _, _ := procCreateDIBSection.Call(
		hdc,
		uintptr(unsafe.Pointer(&header)),
		dibRGBColors,
		uintptr(unsafe.Pointer(&bits)),
		0,
		0,
	)
	if hbmColor == 0 || bits == nil {
		return 0
	}

	dst := unsafe.Slice((*byte)(bits), size*size*4)
	src := img.Pix
	for y := 0; y < size; y++ {
		srcOff := y * img.Stride
		dstOff := y * size * 4
		for x := 0; x < size; x++ {
			si := srcOff + x*4
			di := dstOff + x*4
			dst[di+0] = src[si+2] // B
			dst[di+1] = src[si+1] // G
			dst[di+2] = src[si+0] // R
			dst[di+3] = src[si+3] // A
		}
	}

	maskStride := ((size + 15) / 16) * 2
	maskBits := make([]byte, maskStride*size)
	hbmMask, _, _ := procCreateBitmap.Call(
		uintptr(size),
		uintptr(size),
		1,
		1,
		uintptr(unsafe.Pointer(&maskBits[0])),
	)
	if hbmMask == 0 {
		procDeleteObject.Call(hbmColor)
		return 0
	}

	hot := uint32(size / 2)
	ii := iconInfo{
		fIcon:    0,
		xHotspot: hot,
		yHotspot: hot,
		hbmMask:  hbmMask,
		hbmColor: hbmColor,
	}
	hcursor, _, _ := procCreateIconIndirect.Call(uintptr(unsafe.Pointer(&ii)))
	procDeleteObject.Call(hbmMask)
	procDeleteObject.Call(hbmColor)
	return hcursor
}

func loadArrowCursor() uintptr {
	shared, _, _ := procLoadCursorW.Call(0, idcArrow)
	return shared
}

func loadCrossCursor() uintptr {
	shared, _, _ := procLoadCursorW.Call(0, idcCross)
	if shared == 0 {
		return 0
	}
	copied, _, _ := procCopyIcon.Call(shared)
	return copied
}

func (s *Session) installCursor() {
	h := createCursorFromPNG(targetPNG)
	if h == 0 {
		h = loadCrossCursor()
	}
	if h == 0 {
		return
	}
	s.cursor = h
	for _, id := range systemCursorIDs {
		cp, _, _ := procCopyIcon.Call(h)
		if cp != 0 {
			procSetSystemCursor.Call(cp, id)
		}
	}
	s.cursorChanged = true
}

func (s *Session) restoreCursors() {
	if s.cursorChanged {
		procSystemParametersInfoW.Call(spiSetCursors, 0, 0, 0)
		s.cursorChanged = false
	}
	if s.cursor != 0 {
		procDestroyIcon.Call(s.cursor)
		s.cursor = 0
	}
}
