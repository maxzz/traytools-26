//go:build windows

package dpagent

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"time"
	"unsafe"

	"traytools-26-go/backend/dphook"
	"traytools-26-go/backend/winlaunch"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	user32            = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW   = user32.NewProc("FindWindowW")
	procPostMessageW  = user32.NewProc("PostMessageW")
	shell32           = windows.NewLazySystemDLL("shell32.dll")
	procShellExecuteW = shell32.NewProc("ShellExecuteW")
)

func platformGetStatus() (Status, error) {
	hwnd, running := findAgentWindow()
	st := Status{
		Running:        running,
		AgentIntegrity: IntegrityNA,
		SelfIntegrity:  processIntegrity(windows.CurrentProcess()),
		AgentPath:      resolveAgentPath(),
	}
	if running {
		pid := windowPID(hwnd)
		st.AgentIntegrity = processIntegrityByPID(pid)
	} else {
		st.AgentIntegrity = IntegrityUndetected
	}
	return st, nil
}

func platformStart(asHigh bool) error {
	path := resolveAgentPath()
	if path == "" {
		return fmt.Errorf("DPAgent.exe path is empty; check DigitalPersona BinDir registry")
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("DPAgent.exe not found at %q: %w", path, err)
	}

	if asHigh {
		return shellExecute("runas", path)
	}

	// ShellExecute("open") inherits our integrity. When TrayTools is elevated
	// but "Start DPAgent elevated" is off, launch under Explorer so the agent
	// starts at medium integrity regardless of our status.
	if processIsElevated() {
		return winlaunch.CreateProcessAsExplorerChild(path, "", filepath.Dir(path))
	}
	return shellExecute("open", path)
}

func processIsElevated() bool {
	var token windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token); err != nil {
		return false
	}
	defer token.Close()
	return token.IsElevated()
}

func platformStop() error {
	hwnd, ok := findAgentWindow()
	if ok {
		if err := postClose(hwnd); err != nil {
			return err
		}
	}

	// Give the agent a moment to exit before broadcasting unhook, matching
	// the legacy OnAppAgentStop Sleep(200) + forceunloadhook sequence.
	time.Sleep(200 * time.Millisecond)
	return dphook.ForceUnload()
}

// Implementaion

func findAgentWindow() (windows.HWND, bool) {
	return findWindowPair(agentWindows)
}

// Known DPAgent main-window class/title pairs from the legacy traytools
// dpagent::internals::find_dpagnt_window / find_dpagnt64_window.
var agentWindows = []struct{ class, title string }{
	{"DigitalPersona Pro5.x Agent Window Class", "DigitalPersona Pro5.x Agent Window"}, // This is 64-bit agent C:\Program Files\DigitalPersona\Bin\DPAgent.exe
	{"DigitalPersona Pro Agent", "DigitalPersona Pro Agent"},                           // This is 64-bit agent C:\Program Files\DigitalPersona\Bin\DPAgent.exe
	{"DigitalPersona Pro Agent64", "DigitalPersona Pro Agent64"},                       // This is 32-bit agent C:\Program Files (x86)\DigitalPersona\Bin\DpAgent.exe
	// {"DigitalPersona Personal Agent", "DigitalPersona Personal Agent"},
	// {"U.are.U Personal Agent", "U.are.U Personal Agent"},
	// {"U.are.U Pro Agent", "U.are.U Pro Agent"},
}

func findWindowPair(pairs []struct{ class, title string }) (windows.HWND, bool) {
	for _, p := range pairs {
		hwnd := findWindow(p.class, p.title)
		if hwnd != 0 {
			return hwnd, true
		}
	}
	return 0, false
}

func findWindow(class, title string) windows.HWND {
	c, err := windows.UTF16PtrFromString(class)
	if err != nil {
		return 0
	}
	t, err := windows.UTF16PtrFromString(title)
	if err != nil {
		return 0
	}
	hwnd, _, _ := procFindWindowW.Call(uintptr(unsafe.Pointer(c)), uintptr(unsafe.Pointer(t)))
	return windows.HWND(hwnd)
}

func postClose(hwnd windows.HWND) error {
	ret, _, err := procPostMessageW.Call(uintptr(hwnd), wmClose, 0, 0)
	if ret == 0 {
		if err != nil && err != syscall.Errno(0) {
			return fmt.Errorf("PostMessage(WM_CLOSE): %w", err)
		}
		return fmt.Errorf("PostMessage(WM_CLOSE) failed")
	}
	return nil
}

const wmClose = 0x0010

func windowPID(hwnd windows.HWND) uint32 {
	var pid uint32
	windows.GetWindowThreadProcessId(hwnd, &pid)
	return pid
}

func shellExecute(verb, file string) error {
	v, err := windows.UTF16PtrFromString(verb)
	if err != nil {
		return err
	}
	f, err := windows.UTF16PtrFromString(file)
	if err != nil {
		return err
	}
	ret, _, callErr := procShellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(v)),
		uintptr(unsafe.Pointer(f)),
		0,
		0,
		uintptr(windows.SW_SHOWNORMAL),
	)
	if ret <= 32 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("failed to start %q: %w", file, callErr)
		}
		return fmt.Errorf("failed to start %q (ShellExecute code %d)", file, ret)
	}
	return nil
}

// resolveAgentPath reads BinDir from the 64-bit view of
// HKLM\SOFTWARE\DigitalPersona\Applications[\OTS], falling back to
// %ProgramFiles%\DigitalPersona\Bin\DPAgent.exe.
func resolveAgentPath() string {
	if dir := registryBinDir(); dir != "" {
		return filepath.Join(dir, "DPAgent.exe")
	}
	if root := os.Getenv("ProgramFiles"); root != "" {
		candidate := filepath.Join(root, "DigitalPersona", "Bin", "DPAgent.exe")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

func registryBinDir() string {
	access := uint32(registry.QUERY_VALUE | registry.WOW64_64KEY)

	for _, keyPath := range []string{
		`SOFTWARE\DigitalPersona\Applications\OTS`,
		`SOFTWARE\DigitalPersona\Applications`,
	} {
		k, err := registry.OpenKey(registry.LOCAL_MACHINE, keyPath, access)
		if err != nil {
			continue
		}
		val, _, err := k.GetStringValue("BinDir")
		k.Close()
		if err == nil && val != "" {
			return val
		}
	}
	return ""
}
