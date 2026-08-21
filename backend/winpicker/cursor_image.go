//go:build windows

package winpicker

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/png"
)

const blackPunchMax = 24

func decodeTargetNRGBA(pngBytes []byte, size int) (*image.NRGBA, error) {
	src, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}
	return scaleAndPunchBlack(src, size), nil
}

func decodePNGNative(pngBytes []byte) (*image.NRGBA, error) {
	src, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}
	return imageToNRGBA(src), nil
}

func imageToNRGBA(src image.Image) *image.NRGBA {
	b := src.Bounds()
	dst := image.NewNRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(dst, dst.Bounds(), src, b.Min, draw.Src)
	return dst
}

func scaleAndPunchBlack(src image.Image, size int) *image.NRGBA {
	dst := scaleNRGBA(src, size)
	punchNearBlack(dst)
	return dst
}

func punchNearBlack(img *image.NRGBA) {
	if img == nil {
		return
	}
	b := img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := img.NRGBAAt(x, y)
			if c.R < blackPunchMax && c.G < blackPunchMax && c.B < blackPunchMax {
				c.A = 0
				img.SetNRGBA(x, y, c)
			}
		}
	}
}

// scaleNRGBA resizes src to a square using straight (non-premultiplied) alpha.
// color.Color.RGBA() must not be used here: it returns premultiplied values, and
// a second multiply in the DIB blit would crush anti-aliased edges.
func scaleNRGBA(src image.Image, size int) *image.NRGBA {
	if size < 1 {
		size = 32
	}
	dst := image.NewNRGBA(image.Rect(0, 0, size, size))
	b := src.Bounds()
	sw, sh := b.Dx(), b.Dy()
	if sw < 1 || sh < 1 {
		return dst
	}
	if sw == size && sh == size {
		draw.Draw(dst, dst.Bounds(), src, b.Min, draw.Src)
		return dst
	}
	for y := 0; y < size; y++ {
		sy := b.Min.Y + y*sh/size
		for x := 0; x < size; x++ {
			sx := b.Min.X + x*sw/size
			dst.SetNRGBA(x, y, color.NRGBAModel.Convert(src.At(sx, sy)).(color.NRGBA))
		}
	}
	return dst
}

// nrgbaToPremulBGRA converts straight NRGBA into a tightly packed, top-down,
// premultiplied BGRA buffer for UpdateLayeredWindow(ULW_ALPHA).
func nrgbaToPremulBGRA(img *image.NRGBA) (width, height int, bgra []byte) {
	b := img.Bounds()
	width, height = b.Dx(), b.Dy()
	bgra = make([]byte, width*height*4)
	for y := 0; y < height; y++ {
		srcOff := y * img.Stride
		dstOff := y * width * 4
		for x := 0; x < width; x++ {
			si := srcOff + x*4
			di := dstOff + x*4
			r, g, bl, a := uint32(img.Pix[si+0]), uint32(img.Pix[si+1]), uint32(img.Pix[si+2]), uint32(img.Pix[si+3])
			bgra[di+0] = byte(bl * a / 255)
			bgra[di+1] = byte(g * a / 255)
			bgra[di+2] = byte(r * a / 255)
			bgra[di+3] = byte(a)
		}
	}
	return width, height, bgra
}
