//go:build windows

package tracemanager

import (
	"fmt"
	"os/exec"
	"path/filepath"

	"golang.org/x/sys/windows/registry"
)

// platformOpenRegedit reproduces regeditutils::regeditjump: point regedit's
// "LastKey" at the requested key and launch it there.
func platformOpenRegedit(target string) error {
	var key string
	switch target {
	case "user":
		key = `HKEY_CURRENT_USER\SOFTWARE\DigitalPersona\Applications\OTS`
	case "tracing":
		key = `HKEY_LOCAL_MACHINE\SOFTWARE\DigitalPersona\Tracing`
	default:
		return fmt.Errorf("unknown regedit target %q", target)
	}

	reg, _, err := registry.CreateKey(registry.CURRENT_USER,
		`Software\Microsoft\Windows\CurrentVersion\Applets\Regedit`, registry.SET_VALUE)
	if err == nil {
		reg.SetStringValue("LastKey", "Computer\\"+key)
		reg.Close()
	}

	return exec.Command("regedit.exe").Start()
}

// platformRunTrace reproduces OnAppTraceExp / OnAppTraceImp: call dpocache.dll's
// trace entry through rundll32, and for export open the resulting log.
func platformRunTrace(mode string) error {
	if mode != "exp" && mode != "imp" {
		return fmt.Errorf("unknown trace mode %q", mode)
	}

	binDir := dpBinDir()
	if binDir == "" {
		return fmt.Errorf("could not locate the DigitalPersona bin directory")
	}

	dll := filepath.Join(binDir, "dpocache.dll")
	if err := exec.Command("rundll32.exe", dll, "trace", mode).Start(); err != nil {
		return err
	}

	if mode == "exp" {
		log := filepath.Join(binDir, "otstrace.txt")
		_ = exec.Command("notepad.exe", log).Start()
	}
	return nil
}
