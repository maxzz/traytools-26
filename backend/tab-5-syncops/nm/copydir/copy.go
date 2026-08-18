package copydir

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"traytools-26-go/backend/tab-5-syncops/nm/progress"
	"traytools-26-go/backend/tab-5-syncops/nm/skippat"
)

// CopyOptions controls copy behaviour.
type CopyOptions struct {
	// SkipPatterns are regular expressions matched against each file/folder
	// name and its path relative to the source root.
	SkipPatterns []string
	// Reporter receives scan and copy progress. Default: none.
	Reporter progress.Reporter
}

// Copy copies src into dst, skipping entries that match SkipPatterns and preserving file metadata.
func Copy(src, dst string, opts CopyOptions) error {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	srcInfo, err := os.Lstat(src)
	if err != nil {
		return fmt.Errorf("source: %w", err)
	}
	if !srcInfo.IsDir() {
		return fmt.Errorf("source must be a directory: %s", src)
	}

	if samePath(src, dst) {
		return fmt.Errorf("source and destination must differ")
	}

	if isInside(src, dst) || isInside(dst, src) {
		return fmt.Errorf("source and destination cannot contain each other")
	}

	if err := os.MkdirAll(dst, srcInfo.Mode().Perm()); err != nil {
		return fmt.Errorf("create destination: %w", err)
	}

	reporter := opts.Reporter
	if reporter == nil {
		reporter = progress.NopReporter{}
	}
	reporter.BeginScan(filepath.Base(src))

	matcher, err := skippat.Compile(skippat.Resolve(opts.SkipPatterns))
	if err != nil {
		return err
	}

	return filepath.WalkDir(src, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		if matcher.MatchEntry(rel, entry.Name(), entry.IsDir()) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		target := filepath.Join(dst, rel)

		info, err := entry.Info()
		if err != nil {
			return err
		}

		mode := info.Mode()

		if mode&os.ModeSymlink != 0 {
			link, err := os.Readlink(path)
			if err != nil {
				return fmt.Errorf("read symlink %q: %w", path, err)
			}
			_ = os.Remove(target)
			if err := os.Symlink(link, target); err != nil {
				return fmt.Errorf("create symlink %q: %w", target, err)
			}
			reporter.RecordFile(rel)
			if err := copyFileMetadata(path, target); err != nil {
				return err
			}
			reporter.RecordAction(progress.MarkerAdd, rel)
			return nil
		}

		if info.IsDir() {
			if err := os.MkdirAll(target, mode.Perm()); err != nil {
				return fmt.Errorf("create directory %q: %w", target, err)
			}
			return copyFileMetadata(path, target)
		}

		reporter.RecordFile(rel)

		if err := copyPlatformFile(path, target); err != nil {
			return fmt.Errorf("copy file %q: %w", path, err)
		}
		reporter.RecordAction(progress.MarkerAdd, rel)
		return nil
	})
}

// CopyRel copies a single file or symlink from srcRoot/rel to dstRoot/rel.
func CopyRel(srcRoot, dstRoot, rel string, opts CopyOptions) error {
	srcPath := filepath.Join(srcRoot, rel)
	dstPath := filepath.Join(dstRoot, rel)

	info, err := os.Lstat(srcPath)
	if err != nil {
		return fmt.Errorf("stat %q: %w", srcPath, err)
	}

	mode := info.Mode()

	if mode&os.ModeSymlink != 0 {
		link, err := os.Readlink(srcPath)
		if err != nil {
			return fmt.Errorf("read symlink %q: %w", srcPath, err)
		}
		_ = os.Remove(dstPath)
		if err := os.Symlink(link, dstPath); err != nil {
			return fmt.Errorf("create symlink %q: %w", dstPath, err)
		}
		return copyFileMetadata(srcPath, dstPath)
	}

	if info.IsDir() {
		return fmt.Errorf("CopyRel does not copy directories: %s", rel)
	}

	if err := copyPlatformFile(srcPath, dstPath); err != nil {
		return fmt.Errorf("copy file %q: %w", srcPath, err)
	}
	return nil
}

func samePath(a, b string) bool {
	a = filepath.Clean(a)
	b = filepath.Clean(b)
	if a == b {
		return true
	}
	aa, errA := filepath.Abs(a)
	bb, errB := filepath.Abs(b)
	return errA == nil && errB == nil && aa == bb
}

func isInside(base, target string) bool {
	baseAbs, err := filepath.Abs(base)
	if err != nil {
		return false
	}
	targetAbs, err := filepath.Abs(target)
	if err != nil {
		return false
	}
	rel, err := filepath.Rel(baseAbs, targetAbs)
	if err != nil {
		return false
	}
	return rel != "." && !strings.HasPrefix(rel, "..")
}
