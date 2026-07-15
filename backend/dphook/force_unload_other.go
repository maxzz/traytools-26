//go:build !windows

package dphook

import "fmt"

// ForceUnload is Windows-only; DigitalPersona OTS hooks are not present elsewhere.
func ForceUnload() error {
	return fmt.Errorf("send unload hook notification is only supported on Windows")
}
