package fileicon

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"image/png"
)

type icoDirEntry struct {
	width       int
	height      int
	bitCount    uint16
	bytesInRes  uint32
	imageOffset uint32
}

// icoBytesToPNG picks the smallest image in the ICO (highest bit depth on ties)
// and encodes it as PNG with alpha preserved.
func icoBytesToPNG(ico []byte) ([]byte, error) {
	entries, err := parseICODirectory(ico)
	if err != nil {
		return nil, err
	}
	best := pickSmallestHighestColor(entries)
	if best.width <= 0 || best.height <= 0 {
		return nil, fmt.Errorf("no usable icon image")
	}
	end := int(best.imageOffset + best.bytesInRes)
	if int(best.imageOffset) >= len(ico) || end > len(ico) {
		return nil, fmt.Errorf("icon image out of range")
	}
	imgData := ico[best.imageOffset:end]

	img, err := decodeIconImage(imgData, best.width, best.height, best.bitCount)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func parseICODirectory(ico []byte) ([]icoDirEntry, error) {
	if len(ico) < 6 {
		return nil, fmt.Errorf("ico too short")
	}
	reserved := binary.LittleEndian.Uint16(ico[0:2])
	itype := binary.LittleEndian.Uint16(ico[2:4])
	count := int(binary.LittleEndian.Uint16(ico[4:6]))
	if reserved != 0 || itype != 1 || count <= 0 {
		return nil, fmt.Errorf("invalid ico header")
	}
	const entrySize = 16
	need := 6 + count*entrySize
	if len(ico) < need {
		return nil, fmt.Errorf("ico directory truncated")
	}

	entries := make([]icoDirEntry, 0, count)
	for i := 0; i < count; i++ {
		off := 6 + i*entrySize
		w := int(ico[off])
		h := int(ico[off+1])
		if w == 0 {
			w = 256
		}
		if h == 0 {
			h = 256
		}
		bitCount := binary.LittleEndian.Uint16(ico[off+6 : off+8])
		bytesInRes := binary.LittleEndian.Uint32(ico[off+8 : off+12])
		imageOffset := binary.LittleEndian.Uint32(ico[off+12 : off+16])
		entries = append(entries, icoDirEntry{
			width:       w,
			height:      h,
			bitCount:    bitCount,
			bytesInRes:  bytesInRes,
			imageOffset: imageOffset,
		})
	}
	return entries, nil
}

func pickSmallestHighestColor(entries []icoDirEntry) icoDirEntry {
	var best icoDirEntry
	bestArea := int(^uint(0) >> 1)
	bestBits := -1
	for _, e := range entries {
		area := e.width * e.height
		bits := int(e.bitCount)
		if bits == 0 {
			// PNG-compressed or unspecified: treat as 32-bit truecolor+alpha.
			bits = 32
		}
		if area < bestArea || (area == bestArea && bits > bestBits) {
			best = e
			bestArea = area
			bestBits = bits
		}
	}
	return best
}

func decodeIconImage(data []byte, width, height int, bitCount uint16) (image.Image, error) {
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}) {
		img, err := png.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		return img, nil
	}
	return decodeICOBMP(data, width, height, bitCount)
}

func decodeICOBMP(data []byte, dirWidth, dirHeight int, dirBitCount uint16) (image.Image, error) {
	if len(data) < 40 {
		return nil, fmt.Errorf("bmp icon header truncated")
	}
	biSize := binary.LittleEndian.Uint32(data[0:4])
	if biSize < 40 {
		return nil, fmt.Errorf("unsupported bmp header size")
	}
	width := int(int32(binary.LittleEndian.Uint32(data[4:8])))
	height2 := int(int32(binary.LittleEndian.Uint32(data[8:12])))
	planes := binary.LittleEndian.Uint16(data[12:14])
	bitCount := binary.LittleEndian.Uint16(data[14:16])
	compression := binary.LittleEndian.Uint32(data[16:20])
	_ = planes
	_ = dirBitCount

	if width == 0 {
		width = dirWidth
	}
	height := height2 / 2
	if height <= 0 {
		height = dirHeight
		if height2 > 0 {
			height = height2
		}
	}
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("invalid bmp icon size")
	}
	if compression != 0 && compression != 3 { // BI_RGB or BI_BITFIELDS
		return nil, fmt.Errorf("unsupported bmp compression %d", compression)
	}

	headerSize := int(biSize)
	if compression == 3 && biSize == 40 {
		// Optional bitfields masks (3 or 4 DWORDs) may follow; keep offset from biSize.
	}
	offset := headerSize
	paletteColors := 0
	if bitCount <= 8 {
		clrUsed := binary.LittleEndian.Uint32(data[32:36])
		if clrUsed == 0 {
			paletteColors = 1 << bitCount
		} else {
			paletteColors = int(clrUsed)
		}
	}
	palette := make([]color.NRGBA, paletteColors)
	for i := 0; i < paletteColors; i++ {
		if offset+4 > len(data) {
			return nil, fmt.Errorf("palette truncated")
		}
		b := data[offset]
		g := data[offset+1]
		r := data[offset+2]
		offset += 4
		palette[i] = color.NRGBA{R: r, G: g, B: b, A: 255}
	}

	rowSize := ((int(bitCount)*width + 31) / 32) * 4
	xorSize := rowSize * height
	if offset+xorSize > len(data) {
		return nil, fmt.Errorf("xor bitmap truncated")
	}
	xor := data[offset : offset+xorSize]
	maskOffset := offset + xorSize
	maskRowSize := ((width + 31) / 32) * 4
	maskSize := maskRowSize * height
	var andMask []byte
	if maskOffset+maskSize <= len(data) {
		andMask = data[maskOffset : maskOffset+maskSize]
	}

	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		srcY := height - 1 - y // bottom-up
		row := xor[srcY*rowSize : (srcY+1)*rowSize]
		for x := 0; x < width; x++ {
			var c color.NRGBA
			switch bitCount {
			case 32:
				i := x * 4
				if i+4 > len(row) {
					continue
				}
				c = color.NRGBA{B: row[i], G: row[i+1], R: row[i+2], A: row[i+3]}
			case 24:
				i := x * 3
				if i+3 > len(row) {
					continue
				}
				c = color.NRGBA{B: row[i], G: row[i+1], R: row[i+2], A: 255}
			case 16:
				i := x * 2
				if i+2 > len(row) {
					continue
				}
				v := binary.LittleEndian.Uint16(row[i : i+2])
				// 5-5-5
				c = color.NRGBA{
					R: uint8(((v >> 10) & 0x1f) << 3),
					G: uint8(((v >> 5) & 0x1f) << 3),
					B: uint8((v & 0x1f) << 3),
					A: 255,
				}
			case 8:
				if x >= len(row) {
					continue
				}
				idx := int(row[x])
				if idx < len(palette) {
					c = palette[idx]
				}
			case 4:
				byteIndex := x / 2
				if byteIndex >= len(row) {
					continue
				}
				var idx int
				if x&1 == 0 {
					idx = int(row[byteIndex] >> 4)
				} else {
					idx = int(row[byteIndex] & 0x0f)
				}
				if idx < len(palette) {
					c = palette[idx]
				}
			case 1:
				byteIndex := x / 8
				if byteIndex >= len(row) {
					continue
				}
				bit := 7 - (x % 8)
				idx := int((row[byteIndex] >> bit) & 1)
				if idx < len(palette) {
					c = palette[idx]
				}
			default:
				return nil, fmt.Errorf("unsupported bit count %d", bitCount)
			}

			if andMask != nil && bitCount < 32 {
				mb := andMask[srcY*maskRowSize+x/8]
				bit := 7 - (x % 8)
				if (mb>>bit)&1 == 1 {
					c.A = 0
				}
			} else if bitCount == 32 && c.A == 0 {
				// keep transparent
			}
			img.SetNRGBA(x, y, c)
		}
	}

	// If every 32-bit alpha was 0, the icon likely used a separate mask / unused alpha.
	if bitCount == 32 && andMask != nil && isFullyTransparent(img) {
		for y := 0; y < height; y++ {
			srcY := height - 1 - y
			for x := 0; x < width; x++ {
				c := img.NRGBAAt(x, y)
				mb := andMask[srcY*maskRowSize+x/8]
				bit := 7 - (x % 8)
				if (mb>>bit)&1 == 1 {
					c.A = 0
				} else {
					c.A = 255
				}
				img.SetNRGBA(x, y, c)
			}
		}
	}

	return img, nil
}

func isFullyTransparent(img *image.NRGBA) bool {
	for i := 3; i < len(img.Pix); i += 4 {
		if img.Pix[i] != 0 {
			return false
		}
	}
	return true
}
