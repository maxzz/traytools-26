package tracemanager

// Built-in category descriptions. In the original app the descriptions live
// inside each component DLL and are read through gettraceinfo. When those DLLs
// are not present (e.g. a dev machine, or a non-Windows build) these tables let
// the categories panel still show meaningful, real content. The dpofeedb table
// is copied verbatim from C:\y\DpOFeedb\debugcategories_fbhook.h.

type builtinItem struct {
	bit         int
	description string
}

type builtinSection struct {
	name  string
	items []builtinItem
}

var builtinSections = []builtinSection{
	{
		name: "dpofeedb",
		items: []builtinItem{
			{0, "fbwin: print alien messages"},
			{1, "ALL major messages/events: hooked messages from hook"},
			{2, "add/delete hooked items, and all hooked windows list"},
			{3, "CRITICAL: and hook installed/de-installed, and skipped processes"},
			{4, "DP notifyall notifications (so far just broadcast msgs)"},
			{5, "TO DEBUG ICON: feedback window pos change"},
			{6, "TO DEBUG ICON: msg: wm_windowposchanged"},
			{7, "NOWHERE: (so far) msg: wm_activate"},
			{8, "TO DEBUG CHACHE: def no: trace cache calls only"},
			{9, "Dissable interthread windowname trace"},
			{14, "Don't hook Microsoft Shell aka Windows Explorer"},
			{15, "Don't hook Microsoft Office: Word, Outlook so far"},
			{16, "IE Visual Basic Web Doc"},
		},
	},
}

// builtinSectionsCopy returns the built-in tables as SectionDescription values
// with the given active masks applied (masks keyed by section name). A nil map
// leaves everything inactive.
func builtinSectionsCopy(activeMasks map[string]uint32) []SectionDescription {
	sections := make([]SectionDescription, 0, len(builtinSections))

	for _, bs := range builtinSections {
		mask := activeMasks[bs.name]
		section := SectionDescription{SectionName: bs.name}
		for _, it := range bs.items {
			cat := uint32(1) << uint(it.bit)
			section.Items = append(section.Items, StringDescription{
				Category:    cat,
				Bit:         it.bit,
				Description: it.description,
				Active:      mask&cat != 0,
			})
		}
		sections = append(sections, section)
	}

	assignMemIDs(sections)
	return sections
}

// maskFromSection folds a section's active items back into a single bitmask.
func maskFromSection(section SectionDescription) uint32 {
	var mask uint32
	for _, it := range section.Items {
		if it.Active {
			mask |= uint32(1) << uint(it.Bit)
		}
	}
	return mask
}
