//go:build !windows

package toolsmenu

import "errors"

// The Tools menu launches Windows programs, folders, and the Registry Editor,
// so on other platforms the actions are unavailable. The menu itself still
// loads and renders from tools.json so the configuration can be inspected.

func platformExecTool(target, args string) error {
	return errors.New("launching tools is only available on Windows")
}

func platformOpenRegistry(key, plat string) error {
	return errors.New("the registry editor is only available on Windows")
}
