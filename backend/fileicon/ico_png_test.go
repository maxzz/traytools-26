package fileicon

import "testing"

func TestPickSmallestHighestColor(t *testing.T) {
	entries := []icoDirEntry{
		{width: 32, height: 32, bitCount: 32},
		{width: 16, height: 16, bitCount: 8},
		{width: 16, height: 16, bitCount: 32},
		{width: 48, height: 48, bitCount: 32},
	}
	best := pickSmallestHighestColor(entries)
	if best.width != 16 || best.height != 16 || best.bitCount != 32 {
		t.Fatalf("got %dx%d bpp=%d, want 16x16 bpp=32", best.width, best.height, best.bitCount)
	}
}

func TestPickSmallestTreatsZeroBitCountAs32(t *testing.T) {
	entries := []icoDirEntry{
		{width: 16, height: 16, bitCount: 0}, // PNG entry
		{width: 16, height: 16, bitCount: 8},
	}
	best := pickSmallestHighestColor(entries)
	if best.bitCount != 0 {
		t.Fatalf("expected PNG entry (bitCount 0) to win, got bpp=%d", best.bitCount)
	}
}
