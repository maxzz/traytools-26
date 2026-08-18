package checkdir

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"traytools-26-go/backend/tab-5-syncops/nm/progress"
	"traytools-26-go/backend/tab-5-syncops/nm/skippat"
)

type fileSignature struct {
	size    int64
	modTime time.Time
	symlink bool
	target  string
}

// CompareResult holds the outcome of a source/destination comparison.
type CompareResult struct {
	SourceFileCount int
	Changes         []progress.ChangeEntry
}

// Compare checks files under src and dst by size and modification time.
// skipPatterns are regular expressions; see skippat. Matching directories are
// not descended into. Differences are returned in CompareResult rather than as errors.
// Pass nil for reporter when no progress output is needed.
func Compare(src, dst string, reporter progress.Reporter, skipPatterns []string) (CompareResult, error) {
	src = filepath.Clean(src)
	dst = filepath.Clean(dst)

	if reporter == nil {
		reporter = progress.NopReporter{}
	}

	matcher, err := skippat.Compile(skippat.Resolve(skipPatterns))
	if err != nil {
		return CompareResult{}, err
	}

	srcFiles, err := collectFiles(src, reporter, matcher)
	if err != nil {
		return CompareResult{}, fmt.Errorf("scan source: %w", err)
	}

	// Destination is scanned silently so folder lines and totals are not duplicated.
	dstFiles, err := collectFiles(dst, progress.NopReporter{}, matcher)
	if err != nil {
		return CompareResult{}, fmt.Errorf("scan destination: %w", err)
	}

	changes := diffFiles(srcFiles, dstFiles)

	return CompareResult{
		SourceFileCount: len(srcFiles),
		Changes:         changes,
	}, nil
}

func diffFiles(srcFiles, dstFiles map[string]fileSignature) []progress.ChangeEntry {
	var changes []progress.ChangeEntry

	for rel, srcSig := range srcFiles {
		dstSig, ok := dstFiles[rel]
		if !ok {
			changes = append(changes, progress.ChangeEntry{Marker: progress.MarkerAdd, RelPath: rel})
			continue
		}
		if !signaturesEqual(srcSig, dstSig) {
			changes = append(changes, progress.ChangeEntry{Marker: progress.MarkerModify, RelPath: rel})
		}
	}

	for rel := range dstFiles {
		if _, ok := srcFiles[rel]; !ok {
			changes = append(changes, progress.ChangeEntry{Marker: progress.MarkerDelete, RelPath: rel})
		}
	}

	return changes
}

func collectFiles(root string, reporter progress.Reporter, matcher *skippat.Matcher) (map[string]fileSignature, error) {
	files := make(map[string]fileSignature)
	rootLabel := filepath.Base(root)
	reporter.BeginScan(rootLabel)

	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}

		if matcher.MatchEntry(rel, entry.Name(), entry.IsDir()) {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if entry.IsDir() {
			return nil
		}

		reporter.RecordFile(rel)

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
		return nil
	})
	if err != nil {
		return nil, err
	}

	return files, nil
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
