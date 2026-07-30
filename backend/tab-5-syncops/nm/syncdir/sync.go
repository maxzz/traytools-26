//go:build windows

package syncdir

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	recycle "traytools-26-go/backend/tab-5-syncops/nm/recycle"
	copydir "traytools-26-go/backend/tab-5-syncops/nm/copydir"
	"traytools-26-go/backend/tab-5-syncops/nm/progress"
)

const (
	skipDirName = "node_modules"
	gitDirName  = ".git"
)

type fileSignature struct {
	size    int64
	modTime time.Time
	symlink bool
	target  string
}

// SyncOptions controls synchronization behaviour.
type SyncOptions struct {
	// CopyGit includes the root .git folder in sync.
	// Default: false (skipped).
	CopyGit bool
	// Reporter receives scan and sync progress. Default: none.
	Reporter progress.Reporter
}

// SyncResult holds the outcome of a sync operation.
type SyncResult struct {
	SourceFileCount int
	Changes         []progress.ChangeEntry
}

// Sync updates the destination to match the source by copying new or changed files
// and removing destination files that no longer exist in the source.
// Comparison uses file size and modification time.
func Sync(src, dst string, opts SyncOptions) (SyncResult, error) {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	srcInfo, err := os.Lstat(src)
	if err != nil {
		return SyncResult{}, fmt.Errorf("source: %w", err)
	}
	if !srcInfo.IsDir() {
		return SyncResult{}, fmt.Errorf("source must be a directory: %s", src)
	}

	if samePath(src, dst) {
		return SyncResult{}, fmt.Errorf("source and destination must differ")
	}

	if isInside(src, dst) || isInside(dst, src) {
		return SyncResult{}, fmt.Errorf("source and destination cannot contain each other")
	}

	if err := os.MkdirAll(dst, srcInfo.Mode().Perm()); err != nil {
		return SyncResult{}, fmt.Errorf("create destination: %w", err)
	}

	reporter := opts.Reporter
	if reporter == nil {
		reporter = progress.NopReporter{}
	}

	srcFiles, srcDirs, err := collectTree(src, opts, reporter)
	if err != nil {
		return SyncResult{}, fmt.Errorf("scan source: %w", err)
	}

	dstFiles, _, err := collectTree(dst, opts, progress.NopReporter{})
	if err != nil {
		return SyncResult{}, fmt.Errorf("scan destination: %w", err)
	}

	copyOpts := copydir.CopyOptions{CopyGit: opts.CopyGit}
	var changes []progress.ChangeEntry

	for rel, srcSig := range srcFiles {
		dstSig, ok := dstFiles[rel]
		if ok && signaturesEqual(srcSig, dstSig) {
			continue
		}
		marker := progress.MarkerAdd
		if ok {
			marker = progress.MarkerModify
		}
		reporter.RecordAction(marker, rel)
		changes = append(changes, progress.ChangeEntry{Marker: marker, RelPath: rel})
		if err := copydir.CopyRel(src, dst, rel, copyOpts); err != nil {
			return SyncResult{}, fmt.Errorf("sync copy %q: %w", rel, err)
		}
	}

	for rel := range dstFiles {
		if _, ok := srcFiles[rel]; ok {
			continue
		}
		reporter.RecordAction(progress.MarkerDelete, rel)
		changes = append(changes, progress.ChangeEntry{Marker: progress.MarkerDelete, RelPath: rel})
		target := filepath.Join(dst, rel)
		if err := recycle.MoveToRecycleBin(target); err != nil {
			return SyncResult{}, fmt.Errorf("sync remove %q: %w", rel, err)
		}
	}

	if err := pruneExtraDirs(dst, srcDirs, opts); err != nil {
		return SyncResult{}, fmt.Errorf("sync prune directories: %w", err)
	}

	return SyncResult{SourceFileCount: len(srcFiles), Changes: changes}, nil
}

func collectTree(root string, opts SyncOptions, reporter progress.Reporter) (map[string]fileSignature, map[string]struct{}, error) {
	files := make(map[string]fileSignature)
	dirs := make(map[string]struct{})
	reporter.BeginScan(filepath.Base(root))

	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		if entry.IsDir() {
			if shouldSkipDir(entry.Name(), rel, opts.CopyGit) {
				return filepath.SkipDir
			}
			dirs[rel] = struct{}{}
			return nil
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}

		sig := fileSignature{
			size:    info.Size(),
			modTime: info.ModTime(),
		}

		if info.Mode()&os.ModeSymlink != 0 {
			target, err := os.Readlink(path)
			if err != nil {
				return fmt.Errorf("read symlink %q: %w", path, err)
			}
			sig.symlink = true
			sig.target = target
		}

		files[rel] = sig
		reporter.RecordFile(rel)
		return nil
	})
	if err != nil {
		return nil, nil, err
	}

	return files, dirs, nil
}

func shouldSkipDir(name, rel string, copyGit bool) bool {
	if name == skipDirName {
		return true
	}
	if !copyGit && name == gitDirName && rel == gitDirName {
		return true
	}
	return false
}

func signaturesEqual(a, b fileSignature) bool {
	if a.symlink || b.symlink {
		return a.symlink && b.symlink && a.target == b.target
	}
	if a.size != b.size {
		return false
	}
	return a.modTime.Equal(b.modTime)
}

func pruneExtraDirs(dst string, srcDirs map[string]struct{}, opts SyncOptions) error {
	var relDirs []string

	err := filepath.WalkDir(dst, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !entry.IsDir() {
			return nil
		}

		rel, err := filepath.Rel(dst, path)
		if err != nil || rel == "." {
			return nil
		}

		if shouldSkipDir(entry.Name(), rel, opts.CopyGit) {
			return filepath.SkipDir
		}

		relDirs = append(relDirs, rel)
		return nil
	})
	if err != nil {
		return err
	}

	sort.Slice(relDirs, func(i, j int) bool {
		return len(relDirs[i]) > len(relDirs[j])
	})

	for _, rel := range relDirs {
		if _, ok := srcDirs[rel]; ok {
			continue
		}

		fullPath := filepath.Join(dst, rel)
		entries, err := os.ReadDir(fullPath)
		if err != nil {
			return err
		}
		if len(entries) == 0 {
			if err := os.Remove(fullPath); err != nil {
				return err
			}
		}
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
