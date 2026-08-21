//go:build windows

package fileicon

import (
	"bytes"
	"fmt"
	"image"
	"image/png"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32  = windows.NewLazySystemDLL("user32.dll")
	shell32 = windows.NewLazySystemDLL("shell32.dll")
	gdi32   = windows.NewLazySystemDLL("gdi32.dll")

	procExtractIconExW = shell32.NewProc("ExtractIconExW")
	procDestroyIcon    = user32.NewProc("DestroyIcon")
	procGetIconInfo    = user32.NewProc("GetIconInfo")
	procDrawIconEx     = user32.NewProc("DrawIconEx")

	procGetObjectW         = gdi32.NewProc("GetObjectW")
	procCreateDIBSection   = gdi32.NewProc("CreateDIBSection")
	procCreateCompatibleDC = gdi32.NewProc("CreateCompatibleDC")
	procSelectObject       = gdi32.NewProc("SelectObject")
	procDeleteDC           = gdi32.NewProc("DeleteDC")
	procDeleteObject       = gdi32.NewProc("DeleteObject")
)

type iconInfo struct {
	FIcon    int32
	XHotspot uint32
	YHotspot uint32
	HbmMask  windows.Handle
	HbmColor windows.Handle
}

type bitmap struct {
	Type       int32
	Width      int32
	Height     int32
	WidthBytes int32
	Planes     uint16
	BitsPixel  uint16
	Bits       uintptr
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

// extractViaShellPNG uses ExtractIconEx small icon and renders it to PNG.
func extractViaShellPNG(path string) ([]byte, error) {
	p, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}

	var large, small windows.Handle
	ret, _, callErr := procExtractIconExW.Call(
		uintptr(unsafe.Pointer(p)),
		0,
		uintptr(unsafe.Pointer(&large)),
		uintptr(unsafe.Pointer(&small)),
		1,
	)
	if ret == 0 {
		return nil, fmt.Errorf("ExtractIconEx failed: %v", callErr)
	}
	if large != 0 && large != small {
		procDestroyIcon.Call(uintptr(large))
	}
	hicon := small
	if hicon == 0 {
		hicon = large
	}
	if hicon == 0 {
		return nil, fmt.Errorf("no icon handle")
	}
	defer procDestroyIcon.Call(uintptr(hicon))

	img, err := hiconToImage(hicon)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func hiconToImage(hicon windows.Handle) (image.Image, error) {
	var ii iconInfo
	ok, _, err := procGetIconInfo.Call(uintptr(hicon), uintptr(unsafe.Pointer(&ii)))
	if ok == 0 {
		return nil, fmt.Errorf("GetIconInfo: %v", err)
	}
	if ii.HbmMask != 0 {
		procDeleteObject.Call(uintptr(ii.HbmMask))
	}
	if ii.HbmColor != 0 {
		defer procDeleteObject.Call(uintptr(ii.HbmColor))
	}

	size := 16
	if ii.HbmColor != 0 {
		var bm bitmap
		procGetObjectW.Call(uintptr(ii.HbmColor), unsafe.Sizeof(bm), uintptr(unsafe.Pointer(&bm)))
		if bm.Width > 0 {
			size = int(bm.Width)
		}
	}

	hdc, _, _ := procCreateCompatibleDC.Call(0)
	if hdc == 0 {
		return nil, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(hdc)

	var bi bitmapInfoHeader
	bi.Size = uint32(unsafe.Sizeof(bi))
	bi.Width = int32(size)
	bi.Height = -int32(size) // top-down
	bi.Planes = 1
	bi.BitCount = 32
	bi.Compression = 0 // BI_RGB

	var bitsPtr unsafe.Pointer
	hbm, _, _ := procCreateDIBSection.Call(
		hdc,
		uintptr(unsafe.Pointer(&bi)),
		0, // DIB_RGB_COLORS
		uintptr(unsafe.Pointer(&bitsPtr)),
		0,
		0,
	)
	if hbm == 0 || bitsPtr == nil {
		return nil, fmt.Errorf("CreateDIBSection failed")
	}
	defer procDeleteObject.Call(hbm)

	prev, _, _ := procSelectObject.Call(hdc, hbm)
	defer procSelectObject.Call(hdc, prev)

	const diNormal = 0x0003
	ret, _, err := procDrawIconEx.Call(
		hdc,
		0, 0,
		uintptr(hicon),
		uintptr(size), uintptr(size),
		0, 0,
		diNormal,
	)
	if ret == 0 {
		return nil, fmt.Errorf("DrawIconEx: %v", err)
	}

	pix := unsafe.Slice((*byte)(bitsPtr), size*size*4)
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	// Windows DIB is BGRA; copy into NRGBA.
	for i := 0; i < size*size; i++ {
		b := pix[i*4+0]
		g := pix[i*4+1]
		r := pix[i*4+2]
		a := pix[i*4+3]
		img.Pix[i*4+0] = r
		img.Pix[i*4+1] = g
		img.Pix[i*4+2] = b
		img.Pix[i*4+3] = a
	}

	// If alpha channel is unused (all 0), rebuild opacity from non-black pixels.
	if isFullyTransparent(img) {
		for i := 0; i < size*size; i++ {
			r := img.Pix[i*4+0]
			g := img.Pix[i*4+1]
			b := img.Pix[i*4+2]
			if r|g|b != 0 {
				img.Pix[i*4+3] = 255
			}
		}
	}

	return img, nil
}
