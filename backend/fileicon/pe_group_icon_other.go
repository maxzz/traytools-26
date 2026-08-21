//go:build !windows

package fileicon

import "fmt"

func extractGroupIconICO(path string) ([]byte, error) {
	return nil, fmt.Errorf("PE icon extraction is Windows-only")
}
