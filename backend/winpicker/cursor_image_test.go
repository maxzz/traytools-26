//go:build windows

package winpicker

import (
	"image"
	"image/color"
	"testing"
)

func TestScaleAndPunchBlack(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	src.SetNRGBA(0, 0, color.NRGBA{0, 0, 0, 255})
	src.SetNRGBA(1, 0, color.NRGBA{255, 0, 0, 255})
	src.SetNRGBA(0, 1, color.NRGBA{180, 180, 180, 255})
	src.SetNRGBA(1, 1, color.NRGBA{0, 0, 0, 255})

	dst := scaleAndPunchBlack(src, 2)

	if got := dst.NRGBAAt(0, 0); got.A != 0 {
		t.Fatalf("black background should be transparent, got %+v", got)
	}
	if got := dst.NRGBAAt(1, 0); got.R < 200 || got.A < 200 {
		t.Fatalf("red crosshair should remain opaque, got %+v", got)
	}
	if got := dst.NRGBAAt(0, 1); got.A < 200 {
		t.Fatalf("grey ring should remain opaque, got %+v", got)
	}
}

func TestDecodePNGNativePreservesStraightAlpha(t *testing.T) {
	img, err := decodePNGNative(targetPNG)
	if err != nil {
		t.Fatal(err)
	}
	if got := img.NRGBAAt(0, 0); got.A != 0 {
		t.Fatalf("PNG corner should be transparent, got %+v", got)
	}

	var partial int
	b := img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			a := img.NRGBAAt(x, y).A
			if a > 0 && a < 255 {
				partial++
			}
		}
	}
	if partial < 50 {
		t.Fatalf("expected anti-aliased edges in source PNG, got %d partial-alpha pixels", partial)
	}

	cx, cy := b.Dx()/2, b.Dy()/2
	if img.NRGBAAt(cx, cy).A == 0 {
		t.Fatalf("PNG center should not be empty, got %+v", img.NRGBAAt(cx, cy))
	}
}

func TestNrgbaToPremulBGRADoesNotCrushAlpha(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 1, 1))
	src.SetNRGBA(0, 0, color.NRGBA{R: 255, G: 0, B: 0, A: 128})

	_, _, bgra := nrgbaToPremulBGRA(src)
	if len(bgra) != 4 {
		t.Fatalf("expected 4 bytes, got %d", len(bgra))
	}
	if bgra[2] != 128 { // premultiplied R
		t.Fatalf("premultiplied red should be 128, got %d (double-premul would be ~64)", bgra[2])
	}
	if bgra[3] != 128 {
		t.Fatalf("alpha should stay 128, got %d", bgra[3])
	}
}

func TestParseDragIconMode(t *testing.T) {
	if ParseDragIconMode("cursor") != DragIconSystemCursor {
		t.Fatal("cursor should map to system cursor")
	}
	if ParseDragIconMode("overlay") != DragIconLayeredWindow {
		t.Fatal("overlay should map to layered window")
	}
	if ParseDragIconMode("overlay-show") != DragIconLayeredWindowShowCursor {
		t.Fatal("overlay-show should keep the pointer visible")
	}
	if ParseDragIconMode("") != DragIconLayeredWindow {
		t.Fatal("empty should default to layered window")
	}
	if !DragIconLayeredWindow.usesLayeredOverlay() || DragIconLayeredWindow.overlayShowsPointer() {
		t.Fatal("overlay should hide the pointer")
	}
	if !DragIconLayeredWindowShowCursor.usesLayeredOverlay() || !DragIconLayeredWindowShowCursor.overlayShowsPointer() {
		t.Fatal("overlay-show should use the overlay and show the pointer")
	}
}
