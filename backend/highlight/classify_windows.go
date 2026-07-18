//go:build windows

package highlight

const (
	smXVirtualScreen  = 76
	smYVirtualScreen  = 77
	smCXVirtualScreen = 78
	smCYVirtualScreen = 79
)

func platformClassifyBounds(r BoundsRect) BoundsClassification {
	if r.Right <= r.Left || r.Bottom <= r.Top {
		return BoundsClassification{Kind: "empty"}
	}
	if !intersectsVirtualScreen(r) {
		return BoundsClassification{Kind: "offscreen"}
	}
	return BoundsClassification{Kind: "ok"}
}

func intersectsVirtualScreen(r BoundsRect) bool {
	vx := getSystemMetrics(smXVirtualScreen)
	vy := getSystemMetrics(smYVirtualScreen)
	vw := getSystemMetrics(smCXVirtualScreen)
	vh := getSystemMetrics(smCYVirtualScreen)
	if vw <= 0 || vh <= 0 {
		// Fallback: treat as on-screen if metrics fail.
		return true
	}
	vr := BoundsRect{
		Left:   vx,
		Top:    vy,
		Right:  vx + vw,
		Bottom: vy + vh,
	}
	return !(r.Right <= vr.Left || r.Left >= vr.Right || r.Bottom <= vr.Top || r.Top >= vr.Bottom)
}

func getSystemMetrics(index int) int {
	ret, _, _ := procGetSystemMetrics.Call(uintptr(index))
	return int(int32(ret))
}
