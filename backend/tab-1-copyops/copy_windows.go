//go:build windows

package copyops

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// copyOneFile copies sourceFile into destFolder (basename preserved).
// When the destination already exists with the same size and modtime as the
// source, the copy is skipped.
func copyOneFile(sourceFile, destFolder string) (status string, err error) {
	src := filepath.Clean(sourceFile)
	dstDir := filepath.Clean(destFolder)

	srcInfo, err := os.Stat(src)
	if err != nil {
		return StatusFailed, fmt.Errorf("source: %w", err)
	}
	if srcInfo.IsDir() {
		return StatusFailed, fmt.Errorf("source is a directory, expected a file")
	}

	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		return StatusFailed, fmt.Errorf("create destination folder: %w", err)
	}

	destPath := filepath.Join(dstDir, filepath.Base(src))
	if dstInfo, err := os.Stat(destPath); err == nil && !dstInfo.IsDir() {
		if dstInfo.Size() == srcInfo.Size() && sameModTime(dstInfo.ModTime(), srcInfo.ModTime()) {
			return StatusSkipped, nil
		}
	}

	if err := copyFileContents(src, destPath, srcInfo.ModTime()); err != nil {
		return StatusFailed, err
	}
	return StatusCopied, nil
}

func sameModTime(a, b time.Time) bool {
	// Compare at second resolution; some filesystems truncate sub-second parts.
	return a.Unix() == b.Unix()
}

func copyFileContents(src, dst string, modTime time.Time) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	tmp := dst + ".tmp-traytools"
	out, err := os.OpenFile(tmp, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}

	_, copyErr := io.Copy(out, in)
	closeErr := out.Close()
	if copyErr != nil {
		_ = os.Remove(tmp)
		return copyErr
	}
	if closeErr != nil {
		_ = os.Remove(tmp)
		return closeErr
	}

	if err := os.Chtimes(tmp, modTime, modTime); err != nil {
		_ = os.Remove(tmp)
		return err
	}

	if err := os.Rename(tmp, dst); err != nil {
		// Destination may be locked; try remove+rename once.
		_ = os.Remove(dst)
		if err2 := os.Rename(tmp, dst); err2 != nil {
			_ = os.Remove(tmp)
			return err2
		}
	}
	return nil
}
