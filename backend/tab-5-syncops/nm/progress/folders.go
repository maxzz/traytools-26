package progress

import (
	"path/filepath"
	"strings"
)

// BucketFolder maps a file path to its display folder: the root label or root/first-level subfolder.
func BucketFolder(rootLabel, relPath string) string {
	dir := filepath.Dir(relPath)
	if dir == "." {
		return rootLabel
	}
	first := strings.Split(filepath.ToSlash(dir), "/")[0]
	return filepath.Join(rootLabel, first)
}
