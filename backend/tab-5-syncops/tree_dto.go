package syncops

import (
	"traytools-26-go/backend/tab-5-syncops/nm/progress"
)

func changeToDTO(c progress.ChangeEntry) ChangeDTO { // DTO stands for Data Transfer Object.
	return ChangeDTO{
		Marker:      string(c.Marker),
		RelPath:     c.RelPath,
		DisplayName: c.RelPath,
	}
}

func changesToDTO(changes []progress.ChangeEntry) []ChangeDTO {
	if len(changes) == 0 {
		return []ChangeDTO{}
	}
	out := make([]ChangeDTO, len(changes))
	for i, c := range changes {
		out[i] = changeToDTO(c)
	}
	return out
}

func treeNodeToDTO(n progress.TreeNode) TreeNodeDTO {
	children := make([]TreeNodeDTO, len(n.Children))
	for i, c := range n.Children {
		children[i] = treeNodeToDTO(c)
	}
	return TreeNodeDTO{
		Name:      n.Name,
		FileCount: n.FileCount,
		Children:  children,
		Changes:   changesToDTO(n.Changes),
	}
}

func treeReportToDTO(report progress.TreeReport) TreeReportDTO {
	first := make([]TreeNodeDTO, len(report.FirstLevel))
	for i, n := range report.FirstLevel {
		first[i] = treeNodeToDTO(n)
	}
	return TreeReportDTO{
		FirstLevel:  first,
		RootChanges: changesToDTO(report.RootChanges),
	}
}
