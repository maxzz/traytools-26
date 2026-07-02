//go:build !windows

package winregedit

import "errors"

// Jump is Windows-only; the Registry Editor does not exist elsewhere.
func Jump(keyPath string) error {
	return errors.New("the registry editor is only available on Windows")
}
