//go:build !windows

package toolsmenu

import "errors"

// The Tools menu launches Windows programs, folders, and the Registry Editor,
// so on other platforms the actions are unavailable. The menu itself still
// loads and renders from tools.json so the configuration can be inspected.

func platformExecTool(target, args string, elevated bool) error {
	return errors.New("launching tools is only available on Windows")
}

func platformOpenRegistry(key, plat string, elevated bool) error {
	return errors.New("the registry editor is only available on Windows")
}
