//go:build !windows

package fileicon

import "fmt"

func extractViaShellPNG(path string) ([]byte, error) {
	return nil, fmt.Errorf("shell icon extraction is Windows-only")
}
