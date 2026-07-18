//go:build windows

package backend

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Token information classes / elevation types (winnt.h) not always exported
// as named constants in older x/sys revisions.
const (
	tokenElevationType     = 18
	tokenLinkedToken       = 19
	tokenElevationTypeFull = 2
)

func IsElevated() bool {
	var token windows.Token
	err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token)
	if err != nil {
		return false
	}
	defer token.Close()

	return token.IsElevated()
}

func RelaunchElevated() error {
	return shellExecuteSelf("runas")
}

// RelaunchUnelevated starts a new instance at medium integrity and returns.
// When the current process is elevated, the shell's linked (filtered) token is
// used so the child is not elevated. Callers should exit after success.
func RelaunchUnelevated() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exeDir := filepath.Dir(exe)

	var token windows.Token
	if err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token); err != nil {
		return err
	}
	defer token.Close()

	if !token.IsElevated() {
		return shellExecuteSelf("open")
	}

	linked, err := linkedToken(token)
	if err != nil {
		return fmt.Errorf("linked token: %w", err)
	}
	defer linked.Close()

	var primary windows.Token
	if err := windows.DuplicateTokenEx(
		linked,
		windows.MAXIMUM_ALLOWED,
		nil,
		windows.SecurityImpersonation,
		windows.TokenPrimary,
		&primary,
	); err != nil {
		return fmt.Errorf("duplicate linked token: %w", err)
	}
	defer primary.Close()

	return createProcessAsUser(primary, exe, exeDir)
}

func linkedToken(token windows.Token) (windows.Token, error) {
	var elevType uint32
	var needed uint32
	err := windows.GetTokenInformation(token, tokenElevationType, (*byte)(unsafe.Pointer(&elevType)), uint32(unsafe.Sizeof(elevType)), &needed)
	if err != nil {
		return 0, err
	}
	if elevType != tokenElevationTypeFull {
		return 0, fmt.Errorf("process is elevated but has no linked limited token (elevation type %d)", elevType)
	}

	var linked windows.Handle
	needed = 0
	err = windows.GetTokenInformation(token, tokenLinkedToken, (*byte)(unsafe.Pointer(&linked)), uint32(unsafe.Sizeof(linked)), &needed)
	if err != nil {
		return 0, err
	}
	return windows.Token(linked), nil
}

func createProcessAsUser(token windows.Token, exe, exeDir string) error {
	cmd := `"` + exe + `"`
	if len(os.Args) > 1 {
		cmd += " " + strings.Join(os.Args[1:], " ")
	}
	cmdLine, err := windows.UTF16PtrFromString(cmd)
	if err != nil {
		return err
	}
	dirPtr, err := windows.UTF16PtrFromString(exeDir)
	if err != nil {
		return err
	}

	var si windows.StartupInfo
	si.Cb = uint32(unsafe.Sizeof(si))
	si.Flags = windows.STARTF_USESHOWWINDOW
	si.ShowWindow = uint16(windows.SW_SHOWDEFAULT)

	var pi windows.ProcessInformation
	if err := windows.CreateProcessAsUser(
		token,
		nil,
		cmdLine,
		nil,
		nil,
		false,
		0,
		nil,
		dirPtr,
		&si,
		&pi,
	); err != nil {
		return fmt.Errorf("CreateProcessAsUser: %w", err)
	}
	windows.CloseHandle(pi.Thread)
	windows.CloseHandle(pi.Process)
	return nil
}

func shellExecuteSelf(verbStr string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}

	exeDir := filepath.Dir(exe)

	verb, err := windows.UTF16PtrFromString(verbStr)
	if err != nil {
		return err
	}

	exePtr, err := windows.UTF16PtrFromString(exe)
	if err != nil {
		return err
	}

	dirPtr, err := windows.UTF16PtrFromString(exeDir)
	if err != nil {
		return err
	}

	var paramsArg uintptr
	if len(os.Args) > 1 {
		params, err := windows.UTF16PtrFromString(strings.Join(os.Args[1:], " "))
		if err != nil {
			return err
		}
		paramsArg = uintptr(unsafe.Pointer(params))
	}

	ret, _, err := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(exePtr)),
		paramsArg,
		uintptr(unsafe.Pointer(dirPtr)),
		uintptr(windows.SW_SHOWDEFAULT),
	)
	if ret <= 32 {
		if err != nil && err != syscall.Errno(0) {
			return err
		}
		return fmt.Errorf("ShellExecute failed with code %d", ret)
	}

	return nil
}

var (
	shell32       = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW = shell32.NewProc("ShellExecuteW")
)
