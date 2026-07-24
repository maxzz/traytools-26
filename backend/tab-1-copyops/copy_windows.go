//go:build windows

package copyops

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"
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
		if remErr := os.Remove(dst); remErr != nil {
			_ = os.Remove(tmp)
			// Surface Access Denied from remove so renameLocked can kick in;
			// otherwise the follow-up rename error is often "file exists".
			if isAccessDenied(remErr) {
				return remErr
			}
			return fmt.Errorf("%w (remove dest: %v)", err, remErr)
		}
		if err2 := os.Rename(tmp, dst); err2 != nil {
			_ = os.Remove(tmp)
			return err2
		}
	}
	return nil
}

// renameLockedDestination renames an existing destination file to
// name_locked_N.ext (next free sequential N) so a new copy can use the
// original name. Returns the new path (basename is enough for the UI).
func renameLockedDestination(sourceFile, destFolder string) (string, error) {
	src := filepath.Clean(sourceFile)
	dstDir := filepath.Clean(destFolder)
	destPath := filepath.Join(dstDir, filepath.Base(src))

	info, err := os.Stat(destPath)
	if err != nil {
		return "", fmt.Errorf("destination not found to rename: %w", err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("destination is a directory, expected a file")
	}

	newPath, err := nextLockedName(destPath)
	if err != nil {
		return "", err
	}
	if err := os.Rename(destPath, newPath); err != nil {
		return "", err
	}
	return newPath, nil
}

// nextLockedName returns dir/name_locked_N.ext for the smallest N >= 1 that
// does not already exist.
func nextLockedName(destPath string) (string, error) {
	dir := filepath.Dir(destPath)
	base := filepath.Base(destPath)
	ext := filepath.Ext(base)
	stem := strings.TrimSuffix(base, ext)

	for n := 1; n < 10_000; n++ {
		candidate := filepath.Join(dir, fmt.Sprintf("%s_locked_%d%s", stem, n, ext))
		_, err := os.Stat(candidate)
		if os.IsNotExist(err) {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
	}
	return "", fmt.Errorf("no free locked name for %s", base)
}

// isAccessDenied reports whether err is a Windows access/lock denial that
// renameLocked can recover from by moving the destination aside.
// Matches ERROR_ACCESS_DENIED (5) and ERROR_SHARING_VIOLATION (32).
func isAccessDenied(err error) bool {
	if err == nil {
		return false
	}
	var errno syscall.Errno
	if errors.As(err, &errno) && (errno == 5 || errno == 32) {
		return true
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		return isAccessDenied(pathErr.Err)
	}
	var linkErr *os.LinkError
	if errors.As(err, &linkErr) {
		return isAccessDenied(linkErr.Err)
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "access is denied") ||
		strings.Contains(msg, "being used by another process")
}
