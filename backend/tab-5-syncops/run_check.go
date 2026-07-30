package syncops

import (
	"fmt"
	"path/filepath"
	"strings"

	checkdir "traytools-26-go/backend/tab-5-syncops/nm/checkdir"
	"traytools-26-go/backend/tab-5-syncops/nm/progress"
)

func (m *Manager) runCheck(req FolderPairRequest) (CheckResponse, error) {
	src := filepath.Clean(strings.TrimSpace(req.SourceFolder))
	dst := filepath.Clean(strings.TrimSpace(req.DestFolder))
	if src == "" || dst == "" || src == "." || dst == "." {
		return CheckResponse{}, fmt.Errorf("sourceFolder and destFolder are required")
	}

	srcLabel := filepath.Base(src)
	reporter := newCollectingReporter(srcLabel)

	result, err := checkdir.Compare(src, dst, reporter)
	if err != nil {
		return CheckResponse{}, err
	}

	tree := progress.BuildTreeReport(reporter.DirCounts, result.Changes)
	return CheckResponse{
		Identical:       len(result.Changes) == 0,
		SourceRootLabel: srcLabel,
		SourceFileCount: result.SourceFileCount,
		FolderCount:     progress.CountTrackedFolders(reporter.DirCounts),
		ChangeCount:     len(result.Changes),
		Changes:         changesToDTO(result.Changes),
		Tree:            treeReportToDTO(tree),
	}, nil
}
