//go:build windows

package copyops

import "golang.org/x/sys/windows"

// processIsElevated reports whether the current process token is elevated.
// Kept local to avoid importing the parent backend package (circular).
func processIsElevated() bool {
	var token windows.Token
	err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token)
	if err != nil {
		return false
	}
	defer token.Close()
	return token.IsElevated()
}
