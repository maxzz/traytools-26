//go:build windows

package copyops

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modRstrtmgr             = windows.NewLazySystemDLL("rstrtmgr.dll")
	procRmStartSession      = modRstrtmgr.NewProc("RmStartSession")
	procRmRegisterResources = modRstrtmgr.NewProc("RmRegisterResources")
	procRmGetList           = modRstrtmgr.NewProc("RmGetList")
	procRmEndSession        = modRstrtmgr.NewProc("RmEndSession")
)

const (
	cchRmSessionKey = 32 // CCH_RM_SESSION_KEY
	errorMoreData   = 234
)

type rmUniqueProcess struct {
	ProcessID        uint32
	ProcessStartTime windows.Filetime
}

// rmProcessInfo mirrors RM_PROCESS_INFO (restartmanager.h).
type rmProcessInfo struct {
	Process          rmUniqueProcess
	AppName          [256]uint16 // CCH_RM_MAX_APP_NAME+1
	ServiceShortName [64]uint16  // CCH_RM_MAX_SVC_NAME+1
	ApplicationType  uint32
	AppStatus        uint32
	TSSessionID      uint32
	Restartable      int32
}

// listProcessesLockingFile returns processes Restart Manager reports as using path.
// An empty slice (and nil error) means none were found or the path does not exist.
func listProcessesLockingFile(path string) ([]LockedProcess, error) {
	path = filepath.Clean(path)
	if path == "" || path == "." {
		return nil, nil
	}
	if _, err := os.Stat(path); err != nil {
		return nil, nil
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	pathPtr, err := syscall.UTF16PtrFromString(abs)
	if err != nil {
		return nil, err
	}

	var session uint32
	sessionKey := make([]uint16, cchRmSessionKey+1)
	if ret, _, _ := procRmStartSession.Call(
		uintptr(unsafe.Pointer(&session)),
		0,
		uintptr(unsafe.Pointer(&sessionKey[0])),
	); ret != 0 {
		return nil, syscall.Errno(ret)
	}
	defer procRmEndSession.Call(uintptr(session))

	if ret, _, _ := procRmRegisterResources.Call(
		uintptr(session),
		1,
		uintptr(unsafe.Pointer(&pathPtr)),
		0, 0,
		0, 0,
	); ret != 0 {
		return nil, syscall.Errno(ret)
	}
	runtime.KeepAlive(pathPtr)

	var needed, count, rebootReasons uint32
	ret, _, _ := procRmGetList.Call(
		uintptr(session),
		uintptr(unsafe.Pointer(&needed)),
		uintptr(unsafe.Pointer(&count)),
		0,
		uintptr(unsafe.Pointer(&rebootReasons)),
	)
	if ret != 0 && ret != errorMoreData {
		return nil, syscall.Errno(ret)
	}
	if needed == 0 {
		return nil, nil
	}

	infos := make([]rmProcessInfo, needed)
	count = needed
	if ret, _, _ := procRmGetList.Call(
		uintptr(session),
		uintptr(unsafe.Pointer(&needed)),
		uintptr(unsafe.Pointer(&count)),
		uintptr(unsafe.Pointer(&infos[0])),
		uintptr(unsafe.Pointer(&rebootReasons)),
	); ret != 0 {
		return nil, syscall.Errno(ret)
	}

	out := make([]LockedProcess, 0, count)
	seen := make(map[uint32]struct{}, count)
	for i := 0; i < int(count) && i < len(infos); i++ {
		pid := infos[i].Process.ProcessID
		if pid == 0 {
			continue
		}
		if _, ok := seen[pid]; ok {
			continue
		}
		seen[pid] = struct{}{}

		name := processImageBaseName(pid)
		if name == "" {
			name = windows.UTF16ToString(infos[i].AppName[:])
		}
		if name == "" {
			name = "unknown"
		}
		out = append(out, LockedProcess{Name: name, PID: pid})
	}
	return out, nil
}

func processImageBaseName(pid uint32) string {
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return ""
	}
	defer windows.CloseHandle(h)

	var buf [windows.MAX_PATH]uint16
	size := uint32(len(buf))
	if err := windows.QueryFullProcessImageName(h, 0, &buf[0], &size); err != nil {
		return ""
	}
	return filepath.Base(windows.UTF16ToString(buf[:size]))
}

// lockingPathFromErr returns the path most likely locked, from a PathError/LinkError
// when present, otherwise fallback (typically the destination file path).
func lockingPathFromErr(err error, fallback string) string {
	if err == nil {
		return fallback
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) && pathErr.Path != "" {
		return pathErr.Path
	}
	var linkErr *os.LinkError
	if errors.As(err, &linkErr) {
		if linkErr.New != "" {
			return linkErr.New
		}
		if linkErr.Old != "" {
			return linkErr.Old
		}
	}
	return fallback
}

// lockingProcessesForAccessDenied enumerates holders of the locked path.
// Failures of Restart Manager are ignored so copy reporting still succeeds.
func lockingProcessesForAccessDenied(err error, destPath string) []LockedProcess {
	path := lockingPathFromErr(err, destPath)
	procs, listErr := listProcessesLockingFile(path)
	if listErr != nil || len(procs) == 0 {
		return nil
	}
	return procs
}
