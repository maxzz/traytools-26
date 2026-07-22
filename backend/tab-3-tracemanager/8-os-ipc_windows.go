//go:build windows

package tracemanager

import (
	"encoding/binary"
	"unsafe"

	"golang.org/x/sys/windows"
)

// platformStartCapture implements the reader side of the tmtrace shared-memory
// protocol (tracecore::tmtrace::protocol_t in atl_trace_media.h): a 4 KiB
// pagefile-backed mapping guarded by a mutex and two auto-reset events. A
// producer waits for BUFFER_READY, writes a packed tracecall_t, then signals
// DATA_READY; the reader consumes it and re-arms BUFFER_READY.
//
// This is best-effort: when no producer ever writes, the loop simply blocks
// until stop. If another manager already owns the objects we bail out so we do
// not fight over the single buffer.
const (
	ipcMutexName       = "TM_IPC_MUTEX"
	ipcBufferReadyName = "TM_IPC_BUFFER_READY"
	ipcDataReadyName   = "TM_IPC_DATA_READY"
	ipcBufferName      = "TM_IPC_BUFFER"
	ipcBufferSize      = 4096

	// Packed tracecall_t header (see tracecall_t + tracetext_t, #pragma pack(1)):
	//   ProcessID u32, ThreadID u32, Module u32, functionID i32,
	//   LineCode i32, SizeOfTraceText u32, SizeOfFunctionName u32, then UTF-16 text.
	ipcHeaderSize = 28
)

func platformStartCapture(emit func(TraceCall)) (func(), error) {
	bufName, err := windows.UTF16PtrFromString(ipcBufferName)
	if err != nil {
		return nil, err
	}

	mapping, err := windows.CreateFileMapping(windows.InvalidHandle, nil, windows.PAGE_READWRITE, 0, ipcBufferSize, bufName)
	if err != nil {
		// ERROR_ALREADY_EXISTS still returns a valid handle, but it means another
		// process already hosts the channel; let it own capture.
		if mapping != 0 {
			windows.CloseHandle(mapping)
		}
		return nil, err
	}

	addr, err := windows.MapViewOfFile(mapping, windows.FILE_MAP_READ|windows.FILE_MAP_WRITE, 0, 0, ipcBufferSize)
	if err != nil {
		windows.CloseHandle(mapping)
		return nil, err
	}
	// Workaround for unsafeptr vet false positive on syscall addresses; see golang/go#58625.
	ptr := *(*unsafe.Pointer)(unsafe.Pointer(&addr))
	buf := unsafe.Slice((*byte)(ptr), ipcBufferSize)

	mutexName, _ := windows.UTF16PtrFromString(ipcMutexName)
	mutex, _ := windows.CreateMutex(nil, false, mutexName)

	bufReadyName, _ := windows.UTF16PtrFromString(ipcBufferReadyName)
	bufferReady, err := windows.CreateEvent(nil, 0, 1, bufReadyName) // auto-reset, initially signaled (buffer free)
	if err != nil {
		cleanup(addr, mapping, mutex, 0, 0)
		return nil, err
	}

	dataReadyName, _ := windows.UTF16PtrFromString(ipcDataReadyName)
	dataReady, err := windows.CreateEvent(nil, 0, 0, dataReadyName) // auto-reset, initially non-signaled
	if err != nil {
		cleanup(addr, mapping, mutex, bufferReady, 0)
		return nil, err
	}

	stopEvent, err := windows.CreateEvent(nil, 1, 0, nil) // manual-reset, unnamed
	if err != nil {
		cleanup(addr, mapping, mutex, bufferReady, dataReady)
		return nil, err
	}

	go readLoop(buf, emit, stopEvent, dataReady, bufferReady)

	stop := func() {
		windows.SetEvent(stopEvent)
	}
	// Note: the OS objects are intentionally leaked to the process lifetime after
	// stop; a new startStream reuses the same named objects. Keeping them mapped
	// avoids a race where the reader goroutine touches freed memory.
	return stop, nil
}

func readLoop(buf []byte, emit func(TraceCall), stopEvent, dataReady, bufferReady windows.Handle) {
	handles := []windows.Handle{stopEvent, dataReady}

	for {
		which, err := windows.WaitForMultipleObjects(handles, false, windows.INFINITE)
		if err != nil {
			return
		}
		if which == windows.WAIT_OBJECT_0 { // stopEvent
			return
		}

		if call, ok := decodeTraceCall(buf); ok {
			emit(call)
		}

		windows.SetEvent(bufferReady) // buffer consumed, producers may write again
	}
}

// decodeTraceCall parses one packed tracecall_t out of the shared buffer. It is
// defensive: any inconsistency yields ok=false rather than reading out of range.
func decodeTraceCall(buf []byte) (TraceCall, bool) {
	if len(buf) < ipcHeaderSize {
		return TraceCall{}, false
	}

	pid := binary.LittleEndian.Uint32(buf[0:4])
	tid := binary.LittleEndian.Uint32(buf[4:8])
	module := binary.LittleEndian.Uint32(buf[8:12])
	sizeText := binary.LittleEndian.Uint32(buf[20:24])
	sizeFunc := binary.LittleEndian.Uint32(buf[24:28])

	textOff := ipcHeaderSize
	funcOff := textOff + int(sizeText)
	end := funcOff + int(sizeFunc)
	if sizeText == 0 || funcOff > len(buf) || end > len(buf) {
		return TraceCall{}, false
	}

	text := utf16BytesToString(buf[textOff:funcOff])
	function := utf16BytesToString(buf[funcOff:end])

	colorIndex, stripped := parseTraceColor(text)

	return TraceCall{
		ProcessID:  pid,
		ThreadID:   tid,
		Module:     module,
		Function:   function,
		Text:       stripped,
		ColorIndex: colorIndex,
	}, true
}

func utf16BytesToString(b []byte) string {
	n := len(b) / 2
	u := make([]uint16, n)
	for i := range n {
		u[i] = binary.LittleEndian.Uint16(b[i*2:])
	}
	return windows.UTF16ToString(u)
}

func cleanup(addr uintptr, handles ...windows.Handle) {
	if addr != 0 {
		windows.UnmapViewOfFile(addr)
	}
	for _, h := range handles {
		if h != 0 {
			windows.CloseHandle(h)
		}
	}
}
