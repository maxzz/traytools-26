//go:build !windows

package backend

func platformReadWindowPosition() (x, y int, ok bool) { return 0, 0, false }
func platformApplyWindowPosition(x, y int) bool       { return false }
