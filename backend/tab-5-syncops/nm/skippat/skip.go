package skippat

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// DefaultPatterns are applied when a request omits skipPatterns.
// They match the .git and node_modules folder names (any depth).
var DefaultPatterns = []string{`^\.git$`, `^node_modules$`}

// Matcher tests relative paths and entry names against compiled skip patterns.
type Matcher struct {
	res []*regexp.Regexp
}

// Resolve treats a nil slice as "use defaults" and a non-nil slice (including
// empty) as the explicit list. Empty means skip nothing.
func Resolve(patterns []string) []string {
	if patterns == nil {
		out := make([]string, len(DefaultPatterns))
		copy(out, DefaultPatterns)
		return out
	}
	return patterns
}

// Compile builds a matcher. Empty patterns are ignored. Matching is
// case-insensitive so Windows file names behave as expected.
func Compile(patterns []string) (*Matcher, error) {
	m := &Matcher{}
	for i, raw := range patterns {
		p := strings.TrimSpace(raw)
		if p == "" {
			continue
		}
		re, err := regexp.Compile("(?i)" + p)
		if err != nil {
			return nil, fmt.Errorf("skip pattern %d (%q): %w", i+1, p, err)
		}
		m.res = append(m.res, re)
	}
	return m, nil
}

// MatchEntry reports whether this file or folder should be skipped.
// The pair root (rel "." ) is never skipped. A matching directory should
// not be descended into (filepath.SkipDir).
func (m *Matcher) MatchEntry(rel, name string, isDir bool) bool {
	if m == nil || len(m.res) == 0 {
		return false
	}
	if rel == "." || rel == "" {
		return false
	}
	relSlash := filepath.ToSlash(rel)
	if m.matchString(name) || m.matchString(relSlash) {
		return true
	}
	if isDir && m.matchString(relSlash+"/") {
		return true
	}
	return false
}

func (m *Matcher) matchString(s string) bool {
	for _, re := range m.res {
		if re.MatchString(s) {
			return true
		}
	}
	return false
}
