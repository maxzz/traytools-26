//go:build !windows

package winhighlight

func platformClassifyBounds(r BoundsRect) BoundsClassification {
	if r.Right <= r.Left || r.Bottom <= r.Top {
		return BoundsClassification{Kind: "empty"}
	}
	return BoundsClassification{Kind: "ok"}
}
