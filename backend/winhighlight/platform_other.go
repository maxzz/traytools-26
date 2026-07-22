//go:build !windows

package winhighlight

type noopHighlighter struct{}

func newHighlighter() platformHighlighter { return noopHighlighter{} }

func (noopHighlighter) Highlight(HighlightParams) {}
func (noopHighlighter) Hide()                     {}
