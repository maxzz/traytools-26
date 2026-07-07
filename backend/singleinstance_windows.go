//go:build windows

package backend

import (
	"log"
	"os"
	"syscall"
	"time"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/options"
	"golang.org/x/sys/windows"
)

const (
	swRestore = 9
	swShow    = 5
)

var (
	instanceMutex           windows.Handle
	secondInstanceHandler   func()
	showExistingInstanceMsg uint32
	ipcClassName           = "traytools-26-ipc-" + SingleInstanceUniqueID
	ipcWindowName          = "traytools-26-ipc-window"
	instanceMutexName      = "traytools-26-instance-" + SingleInstanceUniqueID
)

// EnsureSingleInstanceOrExit acquires the app instance lock or notifies an
// already-running instance and exits. Call before elevation relaunch.
func EnsureSingleInstanceOrExit() {
	if !acquireInstanceMutex() {
		notifyExistingInstance()
		os.Exit(0)
	}
}

// setupSingleInstanceIPC creates a hidden IPC window on the UI thread and
// wires the callback used when a second instance is launched.
func setupSingleInstanceIPC(onSecondInstance func()) {
	secondInstanceHandler = onSecondInstance
	showExistingInstanceMsg = registerShowExistingInstanceMessage()
	createIPCWindow()
}

func acquireInstanceMutex() bool {
	name, err := windows.UTF16PtrFromString(instanceMutexName)
	if err != nil {
		log.Printf("single instance: invalid mutex name: %v", err)
		return true
	}

	handle, err := windows.CreateMutex(instanceMutexSecurity(), true, name)
	if err == windows.ERROR_ALREADY_EXISTS {
		if handle != 0 {
			windows.CloseHandle(handle)
		}
		return false
	}
	if err != nil {
		log.Printf("single instance: CreateMutex failed: %v", err)
		return true
	}

	instanceMutex = handle
	return true
}

func instanceMutexSecurity() *windows.SecurityAttributes {
	sa, err := windowsSecurityAttributesForEveryone()
	if err != nil {
		log.Printf("single instance: using default mutex security: %v", err)
		return nil
	}
	return sa
}

func notifyExistingInstance() {
	postShowExistingInstanceMessage(retryFindIPCWindow())
	activateExistingMainWindow(retryFindMainWindow())
}

func retryFindIPCWindow() uintptr {
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if hwnd := findIPCWindow(); hwnd != 0 {
			return hwnd
		}
		time.Sleep(100 * time.Millisecond)
	}
	return 0
}

func retryFindMainWindow() uintptr {
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if hwnd := findMainWindow(); hwnd != 0 {
			return hwnd
		}
		time.Sleep(100 * time.Millisecond)
	}
	return 0
}

func postShowExistingInstanceMessage(hwnd uintptr) {
	msg := registerShowExistingInstanceMessage()
	if hwnd == 0 || msg == 0 {
		return
	}

	procPostMessageW.Call(
		hwnd,
		uintptr(msg),
		0,
		0,
	)
}

func registerShowExistingInstanceMessage() uint32 {
	name, err := windows.UTF16PtrFromString("traytools-26-show-" + SingleInstanceUniqueID)
	if err != nil {
		return 0
	}

	msg, _, _ := procRegisterWindowMessageW.Call(uintptr(unsafe.Pointer(name)))
	return uint32(msg)
}

func activateExistingMainWindow(hwnd uintptr) {
	if hwnd == 0 {
		return
	}

	procShowWindow.Call(hwnd, uintptr(swRestore))
	procShowWindow.Call(hwnd, uintptr(swShow))
	procSetForegroundWindow.Call(hwnd)
}

func findIPCWindow() uintptr {
	className, err := windows.UTF16PtrFromString(ipcClassName)
	if err != nil {
		return 0
	}
	windowName, err := windows.UTF16PtrFromString(ipcWindowName)
	if err != nil {
		return 0
	}

	hwnd, _, _ := procFindWindowW.Call(
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(windowName)),
	)
	return hwnd
}

func findMainWindow() uintptr {
	title, err := windows.UTF16PtrFromString(AppWindowTitle)
	if err != nil {
		return 0
	}

	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(title)))
	return hwnd
}

func createIPCWindow() {
	className, err := windows.UTF16PtrFromString(ipcClassName)
	if err != nil {
		log.Printf("single instance: invalid IPC class name: %v", err)
		return
	}
	windowName, err := windows.UTF16PtrFromString(ipcWindowName)
	if err != nil {
		log.Printf("single instance: invalid IPC window name: %v", err)
		return
	}

	wndProc := syscall.NewCallback(ipcWindowProc)
	moduleHandle, _, _ := procGetModuleHandleW.Call(0)

	class := wndClassEx{
		Size:      uint32(unsafe.Sizeof(wndClassEx{})),
		WndProc:   wndProc,
		Instance:  moduleHandle,
		ClassName: className,
	}

	if ret, _, _ := procRegisterClassExW.Call(uintptr(unsafe.Pointer(&class))); ret == 0 {
		log.Printf("single instance: RegisterClassEx failed")
		return
	}

	hwnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(windowName)),
		0,
		0,
		0,
		0,
		0,
		uintptr(hwndMessage),
		0,
		moduleHandle,
		0,
	)
	if hwnd == 0 {
		log.Printf("single instance: failed to create IPC window")
	}
}

func ipcWindowProc(hwnd, msg, wparam, lparam uintptr) uintptr {
	if msg == uintptr(showExistingInstanceMsg) && showExistingInstanceMsg != 0 && secondInstanceHandler != nil {
		go secondInstanceHandler()
		return 0
	}

	ret, _, _ := procDefWindowProcW.Call(hwnd, msg, wparam, lparam)
	return ret
}

func windowsSecurityAttributesForEveryone() (*windows.SecurityAttributes, error) {
	const everyoneSD = "D:(A;;GA;;;WD)"

	sdString, err := windows.UTF16PtrFromString(everyoneSD)
	if err != nil {
		return nil, err
	}

	var sd *windows.SECURITY_DESCRIPTOR
	var sdSize uint32
	err = convertStringSecurityDescriptorToSecurityDescriptor(
		sdString,
		1,
		&sd,
		&sdSize,
	)
	if err != nil {
		return nil, err
	}

	return &windows.SecurityAttributes{
		Length:             uint32(unsafe.Sizeof(windows.SecurityAttributes{})),
		SecurityDescriptor: sd,
	}, nil
}

func convertStringSecurityDescriptorToSecurityDescriptor(
	stringSecurityDescriptor *uint16,
	revision uint32,
	securityDescriptor **windows.SECURITY_DESCRIPTOR,
	size *uint32,
) error {
	ret, _, err := procConvertStringSecurityDescriptorToSecurityDescriptorW.Call(
		uintptr(unsafe.Pointer(stringSecurityDescriptor)),
		uintptr(revision),
		uintptr(unsafe.Pointer(securityDescriptor)),
		uintptr(unsafe.Pointer(size)),
	)
	if ret == 0 {
		if err != nil && err != syscall.Errno(0) {
			return err
		}
		return syscall.EINVAL
	}
	return nil
}

type wndClassEx struct {
	Size       uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   uintptr
	Icon       uintptr
	Cursor     uintptr
	Background uintptr
	MenuName   *uint16
	ClassName  *uint16
	IconSm     uintptr
}

const hwndMessage = ^uintptr(0) - 2 // HWND_MESSAGE

var (
	user32     = windows.NewLazySystemDLL("user32.dll")
	kernel32   = windows.NewLazySystemDLL("kernel32.dll")
	advapi32   = windows.NewLazySystemDLL("advapi32.dll")
	procFindWindowW  = user32.NewProc("FindWindowW")
	procPostMessageW = user32.NewProc("PostMessageW")
	procRegisterWindowMessageW = user32.NewProc("RegisterWindowMessageW")
	procShowWindow = user32.NewProc("ShowWindow")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procRegisterClassExW = user32.NewProc("RegisterClassExW")
	procCreateWindowExW = user32.NewProc("CreateWindowExW")
	procDefWindowProcW = user32.NewProc("DefWindowProcW")
	procGetModuleHandleW = kernel32.NewProc("GetModuleHandleW")
	procConvertStringSecurityDescriptorToSecurityDescriptorW = advapi32.NewProc("ConvertStringSecurityDescriptorToSecurityDescriptorW")
)

// SingleInstanceLock is unused on Windows; single-instance is handled natively.
func (a *App) SingleInstanceLock() *options.SingleInstanceLock {
	return nil
}
