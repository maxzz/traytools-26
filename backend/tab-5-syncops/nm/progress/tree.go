package progress

import (
	"path/filepath"
	"sort"
	"strings"
)

// TreeNode is a first- or second-level directory in the comparison report.
type TreeNode struct {
	Name      string
	RelDir    string
	FileCount int
	Children  []TreeNode
	Changes   []ChangeEntry
}

// TreeReport is the hierarchical folder summary shown after scanning.
type TreeReport struct {
	FirstLevel  []TreeNode
	RootChanges []ChangeEntry
}

// RecordSubtreeCounts increments file counts for first- and second-level directories.
func RecordSubtreeCounts(dirCounts map[string]int, relPath string) {
	dir := filepath.Dir(relPath)
	if dir == "." {
		return
	}
	parts := strings.Split(filepath.ToSlash(dir), "/")
	for i := 1; i <= len(parts) && i <= 2; i++ {
		key := filepath.Join(parts[:i]...)
		dirCounts[key]++
	}
}

// ChangeParentDir returns the directory key where a change is shown in the tree.
// Empty string means a root-level file.
func ChangeParentDir(relPath string) string {
	parts := strings.Split(filepath.ToSlash(relPath), "/")
	if len(parts) == 1 {
		return ""
	}
	dirParts := parts[:len(parts)-1]
	if len(dirParts) == 1 {
		return dirParts[0]
	}
	return filepath.Join(dirParts[0], dirParts[1])
}

// ChangeDisplayName returns the filename shown on a change line within parentDir.
func ChangeDisplayName(relPath, parentDir string) string {
	parts := strings.Split(filepath.ToSlash(relPath), "/")
	if parentDir == "" {
		return parts[len(parts)-1]
	}
	parentParts := strings.Split(filepath.ToSlash(parentDir), "/")
	if len(parts) <= len(parentParts) {
		return parts[len(parts)-1]
	}
	rest := parts[len(parentParts):]
	if len(rest) == 1 {
		return rest[0]
	}
	return filepath.Join(rest...)
}

// BuildTreeReport builds a two-level folder tree from scan counts and changes.
func BuildTreeReport(dirCounts map[string]int, changes []ChangeEntry) TreeReport {
	firstLevel := firstLevelDirs(dirCounts)
	report := TreeReport{FirstLevel: make([]TreeNode, 0, len(firstLevel))}

	changesByParent := groupChangesByParent(changes)

	for _, name := range firstLevel {
		node := TreeNode{
			Name:      name,
			RelDir:    name,
			FileCount: dirCounts[name],
			Children:  buildSecondLevel(name, dirCounts, changesByParent),
			Changes:   cloneChanges(changesByParent[name]),
		}
		sortChanges(node.Changes)
		for i := range node.Children {
			sortChanges(node.Children[i].Changes)
		}
		report.FirstLevel = append(report.FirstLevel, node)
	}

	report.RootChanges = cloneChanges(changesByParent[""])
	sortChanges(report.RootChanges)

	return report
}

func firstLevelDirs(dirCounts map[string]int) []string {
	seen := make(map[string]struct{})
	for key := range dirCounts {
		if !strings.Contains(filepath.ToSlash(key), "/") {
			seen[key] = struct{}{}
		}
	}
	dirs := make([]string, 0, len(seen))
	for name := range seen {
		dirs = append(dirs, name)
	}
	sort.Strings(dirs)
	return dirs
}

func buildSecondLevel(parent string, dirCounts map[string]int, changesByParent map[string][]ChangeEntry) []TreeNode {
	prefix := parent + string(filepath.Separator)
	var children []TreeNode

	for key, count := range dirCounts {
		if !strings.HasPrefix(key, prefix) {
			continue
		}
		rest := strings.TrimPrefix(key, prefix)
		if rest == "" || strings.Contains(filepath.ToSlash(rest), "/") {
			continue
		}
		children = append(children, TreeNode{
			Name:      rest,
			RelDir:    key,
			FileCount: count,
			Changes:   cloneChanges(changesByParent[key]),
		})
	}

	sort.Slice(children, func(i, j int) bool {
		return children[i].Name < children[j].Name
	})
	return children
}

func groupChangesByParent(changes []ChangeEntry) map[string][]ChangeEntry {
	byParent := make(map[string][]ChangeEntry)
	for _, change := range changes {
		parent := ChangeParentDir(change.RelPath)
		byParent[parent] = append(byParent[parent], ChangeEntry{
			Marker:  change.Marker,
			RelPath: ChangeDisplayName(change.RelPath, parent),
		})
	}
	return byParent
}

func cloneChanges(changes []ChangeEntry) []ChangeEntry {
	if len(changes) == 0 {
		return nil
	}
	out := make([]ChangeEntry, len(changes))
	copy(out, changes)
	return out
}

func sortChanges(changes []ChangeEntry) {
	sort.Slice(changes, func(i, j int) bool {
		if changes[i].Marker != changes[j].Marker {
			return changes[i].Marker < changes[j].Marker
		}
		return changes[i].RelPath < changes[j].RelPath
	})
}

// CountTrackedFolders returns the number of first- and second-level directories with files.
func CountTrackedFolders(dirCounts map[string]int) int {
	return len(dirCounts)
}

// AnimationLabel returns the folder name shown in the scan spinner line.
func AnimationLabel(relPath string) string {
	parts := strings.Split(filepath.ToSlash(relPath), "/")
	if len(parts) == 1 {
		return "."
	}
	if len(parts) >= 3 {
		return filepath.Join(parts[0], parts[1])
	}
	return parts[0]
}
