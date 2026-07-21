//go:build windows

package windowtree

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// platformGetProcessInfo returns path / cmdline / bits / user / integrity for a PID.
func platformGetProcessInfo(pid uint32) (ProcessInfo, error) {
	info := ProcessInfo{ProcessID: pid, Integrity: "undetected"}
	if pid == 0 {
		return info, nil
	}

	proc := processImage(pid)
	info.ProcessName = proc.name
	info.ProcessPath = proc.path
	info.Bits = proc.bits
	info.UserName = proc.userName
	info.Integrity = proc.integrity
	info.CommandLine = processCommandLine(pid)

	// Valid when we could open the process or at least resolve a path/name.
	info.Valid = info.ProcessPath != "" || info.ProcessName != "" || info.Bits != 0 || info.UserName != "" || info.CommandLine != ""
	if !info.Valid {
		// Still mark valid so the UI can show the PID with N/A fields when the
		// process exists in the tree but details are inaccessible.
		info.Valid = true
	}
	return info, nil
}

// processCommandLine reads the target process PEB command line via
// NtQueryInformationProcess + ReadProcessMemory. Returns "" when access is
// denied, the process is 32-bit under WOW64 (not handled here), or it has exited.
func processCommandLine(pid uint32) string {
	if pid == 0 {
		return ""
	}
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_INFORMATION|windows.PROCESS_VM_READ, false, pid)
	if err != nil {
		// Fall back to limited query; VM_READ may still succeed on some builds.
		h, err = windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION|windows.PROCESS_VM_READ, false, pid)
		if err != nil {
			return ""
		}
	}
	defer windows.CloseHandle(h)

	var pbi windows.PROCESS_BASIC_INFORMATION
	if err := windows.NtQueryInformationProcess(h, windows.ProcessBasicInformation, unsafe.Pointer(&pbi), uint32(unsafe.Sizeof(pbi)), nil); err != nil {
		return ""
	}
	pebAddr := uintptr(unsafe.Pointer(pbi.PebBaseAddress))
	if pebAddr == 0 {
		return ""
	}

	// PEB.ProcessParameters is at offset 0x20 on 64-bit Windows.
	if unsafe.Sizeof(uintptr(0)) != 8 {
		return ""
	}
	var paramsAddr uintptr
	if err := readProcessMemory(h, pebAddr+0x20, unsafe.Pointer(&paramsAddr), unsafe.Sizeof(paramsAddr)); err != nil || paramsAddr == 0 {
		return ""
	}

	// RTL_USER_PROCESS_PARAMETERS.CommandLine (UNICODE_STRING) at offset 0x70.
	type unicodeString struct {
		Length        uint16
		MaximumLength uint16
		_             uint32
		Buffer        uintptr
	}
	var us unicodeString
	if err := readProcessMemory(h, paramsAddr+0x70, unsafe.Pointer(&us), unsafe.Sizeof(us)); err != nil {
		return ""
	}
	if us.Length == 0 || us.Buffer == 0 {
		return ""
	}
	chars := int(us.Length / 2)
	if chars <= 0 || chars > 32768 {
		return ""
	}
	buf := make([]uint16, chars)
	if err := readProcessMemory(h, us.Buffer, unsafe.Pointer(&buf[0]), uintptr(us.Length)); err != nil {
		return ""
	}
	return windows.UTF16ToString(buf)
}

func readProcessMemory(h windows.Handle, addr uintptr, dest unsafe.Pointer, size uintptr) error {
	var read uintptr
	return windows.ReadProcessMemory(h, addr, (*byte)(dest), size, &read)
}
