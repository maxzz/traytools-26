//go:build windows

package winpicker

import (
	"encoding/json"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"traytools-26-go/backend/winpicker/win32"
)

var (
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")

	procSetWindowsHookExW   = user32.NewProc("SetWindowsHookExW")
	procUnhookWindowsHookEx = user32.NewProc("UnhookWindowsHookEx")
	procCallNextHookEx      = user32.NewProc("CallNextHookEx")
	procGetMessageW         = user32.NewProc("GetMessageW")
	procTranslateMessage    = user32.NewProc("TranslateMessage")
	procDispatchMessageW    = user32.NewProc("DispatchMessageW")
	procPostThreadMessageW  = user32.NewProc("PostThreadMessageW")
	procGetCurrentThreadID  = kernel32.NewProc("GetCurrentThreadId")
	procGetAsyncKeyState    = user32.NewProc("GetAsyncKeyState")
)

const (
	whMouseLL = 14
	wmQuit    = 0x0012

	wmMouseMove     = 0x0200
	wmLButtonDown   = 0x0201
	wmLButtonUp     = 0x0202
	wmLButtonDblClk = 0x0203
	wmRButtonDown   = 0x0204
	wmRButtonUp     = 0x0205
	wmMButtonDown   = 0x0207
	wmMButtonUp     = 0x0208
	wmMouseWheel    = 0x020A
	wmXButtonDown   = 0x020B
	wmXButtonUp     = 0x020C
	wmMouseHWheel   = 0x020E

	vkLButton = 0x01
	vkEscape  = 0x1B

	minMoveInterval = 16 * time.Millisecond
)

type msg struct {
	hwnd    uintptr
	message uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	pt      win32.Point
}

var mouseProcAddr = windows.NewCallback(mouseProc)

func mouseProc(nCode, wParam, lParam uintptr) uintptr {
	if int32(nCode) >= 0 {
		s := activeSession
		if s != nil {
			switch uint32(wParam) {
			case wmMouseMove:
				s.moveOverlayTo(*(*win32.Point)(unsafe.Pointer(lParam)))
				if keyDown(vkEscape) {
					s.complete()
					return 1
				}
				s.emit(probeCursor(false))
			case wmLButtonUp, wmRButtonUp, wmMButtonUp, wmXButtonUp:
				s.complete()
				return 1
			case wmLButtonDown, wmRButtonDown, wmMButtonDown, wmLButtonDblClk,
				wmXButtonDown, wmMouseWheel, wmMouseHWheel:
				return 1
			}
		}
	}
	ret, _, _ := procCallNextHookEx.Call(0, nCode, wParam, lParam)
	return ret
}

func keyDown(vk uintptr) bool {
	ret, _, _ := procGetAsyncKeyState.Call(vk)
	return int16(ret) < 0
}

func (s *Session) emit(ev Event) {
	s.mu.Lock()
	if !ev.Released {
		samePos := ev.Screen == s.last.Screen && ev.Client == s.last.Client
		if samePos && ev.ProcessName == s.last.ProcessName {
			s.mu.Unlock()
			return
		}
		now := time.Now()
		if ev.ProcessName == s.last.ProcessName && now.Sub(s.lastAt) < minMoveInterval {
			s.mu.Unlock()
			return
		}
		s.lastAt = now
	}
	s.last = ev
	cb := s.callback
	s.mu.Unlock()

	if cb == nil {
		return
	}
	data, err := json.Marshal(ev)
	if err != nil {
		return
	}
	// Emit off the hook thread so a slow Wails EventsEmit cannot stall WH_MOUSE_LL
	// (and so a frontend Stop call cannot deadlock the hook).
	go cb(string(data))
}

func (s *Session) complete() {
	s.mu.Lock()
	if s.completing {
		s.mu.Unlock()
		return
	}
	s.completing = true
	s.mu.Unlock()
	s.emit(probeCursor(true))
	s.requestStop()
}

func (s *Session) requestStop() {
	s.mu.Lock()
	tid := s.threadID
	s.mu.Unlock()
	if tid != 0 {
		procPostThreadMessageW.Call(uintptr(tid), wmQuit, 0, 0)
	}
}
