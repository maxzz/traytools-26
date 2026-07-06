//go:build windows

package backend

import (
	"encoding/json"
	"log"
	"os"
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/options"
	"golang.org/x/sys/windows"
)

const (
	wmCopyDataSingleInstanceData = 1542
	wmCopyData                   = 0x004A
)

type copyDataStruct struct {
	dwData uintptr
	cbData uint32
	lpData uintptr
}

// EnsureSingleInstanceOrExit notifies an already-running instance and exits
// if this process is a duplicate launch. Call before elevation relaunch so a
// second shortcut click does not trigger UAC unnecessarily.
func EnsureSingleInstanceOrExit() {
	if !singleInstanceEnabled() {
		return
	}

	id := "wails-app-" + SingleInstanceUniqueID
	className := id + "-sic"
	windowName := id + "-siw"
	mutexName := id + "sim"

	handle, err := windows.OpenMutex(windows.SYNCHRONIZE, false, windows.StringToUTF16Ptr(mutexName))
	if err != nil {
		return
	}
	windows.CloseHandle(handle)

	hwnd, _, _ := procFindWindowW.Call(
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(className))),
		uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(windowName))),
	)
	if hwnd == 0 {
		return
	}

	data := options.SecondInstanceData{
		Args: os.Args[1:],
	}
	data.WorkingDirectory, err = os.Getwd()
	if err != nil {
		log.Printf("single instance: failed to get working directory: %v", err)
		return
	}

	serialized, err := json.Marshal(data)
	if err != nil {
		log.Printf("single instance: failed to marshal data: %v", err)
		return
	}

	payload := string(serialized)
	arrUtf16, _ := syscall.UTF16FromString(payload)

	copyData := copyDataStruct{
		dwData: wmCopyDataSingleInstanceData,
		cbData: uint32(len(arrUtf16)*2 + 1),
		lpData: uintptr(unsafe.Pointer(windows.StringToUTF16Ptr(payload))),
	}

	procSendMessageW.Call(
		hwnd,
		uintptr(wmCopyData),
		0,
		uintptr(unsafe.Pointer(&copyData)),
	)

	os.Exit(0)
}

var (
	user32           = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW  = user32.NewProc("FindWindowW")
	procSendMessageW = user32.NewProc("SendMessageW")
)
