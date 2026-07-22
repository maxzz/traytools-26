//go:build !windows

package copyops

func processIsElevated() bool { return false }
