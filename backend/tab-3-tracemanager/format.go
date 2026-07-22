package tracemanager

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// This file reproduces the self-describing trace text format from
// debugcategories_def.h / debugcategories_impl.h. Each DLL's gettraceinfo
// returns text like:
//
//	  ##############
//	  #..dpofeedb..#
//	  #
//	1 #[00]# fbwin: print alien messages
//	0 #[01]# ALL major messages/events: hooked messages from hook
//	...
//
// settraceinfo consumes the same format (with a leading "all" section that
// carries the on/off/restore action). The parser below is tolerant of the
// exact whitespace produced by makesectionheader().

const sectionActionName = "all" // debugus::SECTIONACTIONS::SECTIONNAME

var (
	// Matches "#..name..#" anywhere on a line.
	reSectionHeader = regexp.MustCompile(`#\.\.(.+?)\.\.#`)
	// Matches an item line: "<active> #[<hexbit>]# <description>".
	reItemLine = regexp.MustCompile(`^\s*([01])\s+#\[([0-9a-fA-F]+)\]#\s?(.*)$`)
)

// parseTraceInfo parses one or more sections out of the DLL text format. The
// synthetic "all" action section is skipped, mirroring entrypoint_export.
func parseTraceInfo(text string) []SectionDescription {
	var sections []SectionDescription
	var current *SectionDescription

	for _, rawLine := range strings.Split(text, "\n") {
		line := strings.TrimRight(rawLine, "\r")

		if m := reSectionHeader.FindStringSubmatch(line); m != nil {
			name := strings.TrimSpace(m[1])
			if strings.EqualFold(name, sectionActionName) {
				current = nil // skip the "all" action section
				continue
			}
			sections = append(sections, SectionDescription{SectionName: name})
			current = &sections[len(sections)-1]
			continue
		}

		if current == nil {
			continue
		}

		if m := reItemLine.FindStringSubmatch(line); m != nil {
			bit, err := strconv.ParseInt(m[2], 16, 32)
			if err != nil {
				continue
			}
			current.Items = append(current.Items, StringDescription{
				Category:    1 << uint(bit),
				Bit:         int(bit),
				Description: strings.TrimSpace(m[3]),
				Active:      m[1] == "1",
			})
		}
	}

	assignMemIDs(sections)
	return sections
}

// buildSectionHeader reproduces debugus::impl::makesectionheader.
func buildSectionHeader(name string) string {
	hashes := strings.Repeat("#", len(name)+3+3)
	return fmt.Sprintf("\n  %s\n  #..%s..#\n  #\n", hashes, name)
}

// buildItemLine reproduces the "%d #[%02x]# %s" item line.
func buildItemLine(active bool, bit int, description string) string {
	a := 0
	if active {
		a = 1
	}
	return fmt.Sprintf("%d #[%02x]# %s\n", a, bit, description)
}

// buildActionSection reproduces SECTIONACTIONS::toString for the empty state,
// which every settraceinfo payload starts with.
func buildActionSection() string {
	var b strings.Builder
	b.WriteString(buildSectionHeader(sectionActionName))
	// Bits: notrace=0, all=1, restore=2. All inactive for the "empty" state.
	b.WriteString(buildItemLine(false, 0, "do not trace"))
	b.WriteString(buildItemLine(false, 1, "trace all"))
	b.WriteString(buildItemLine(false, 2, "restore to the point befere last set"))
	return b.String()
}

// buildTraceInfo serializes sections back into the DLL text format, including
// the leading "all" action section. This is what settraceinfo expects.
func buildTraceInfo(sections []SectionDescription) string {
	var b strings.Builder
	b.WriteString(buildActionSection())

	for _, section := range sections {
		b.WriteString(buildSectionHeader(section.SectionName))
		for _, item := range section.Items {
			b.WriteString(buildItemLine(item.Active, item.Bit, item.Description))
		}
	}

	return b.String()
}
