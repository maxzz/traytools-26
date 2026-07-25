//go:build !windows

package copyops

func lockingProcessesForAccessDenied(err error, destPath string) []LockedProcess {
	return nil
}
