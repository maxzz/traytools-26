//go:build windows

package winpicker

import (
	_ "embed"
	"runtime"
	"sync"
	"time"
	"unsafe"

	"traytools-26-go/backend/winpicker/win32"
)

//go:embed target.png
var targetPNG []byte

// Session is an idle-or-running window-finder session. Start installs a
// WH_MOUSE_LL hook on a dedicated OS thread so tracking continues while the
// cursor is over other processes; the Wails UI is not blocked.
type Session struct {
	mu            sync.Mutex
	running       bool
	completing    bool
	threadID      uint32
	hook          uintptr
	callback      func(json string)
	stopped       chan struct{}
	last          Event
	lastAt        time.Time
	iconMode      DragIconMode
	overlayHwnd   uintptr
	overlayHalfW  int32
	overlayHalfH  int32
	cursor        uintptr
	cursorChanged bool
	cursorHidden  bool
}

var activeSession *Session

// NewSession returns an idle finder session.
func NewSession() *Session {
	return &Session{}
}

// Start begins mouse tracking. onEvent receives JSON Event values (move, then
// one Released=true payload). iconMode selects HCURSOR vs a layered overlay
// (with or without a visible system pointer).
// Returns false if the hook could not be installed.
func (s *Session) Start(onEvent func(json string), iconMode DragIconMode) bool {
	s.mu.Lock()
	if s.running {
		s.callback = onEvent
		s.mu.Unlock()
		return true
	}
	s.running = true
	s.completing = false
	s.callback = onEvent
	s.iconMode = iconMode
	s.last = Event{}
	s.lastAt = time.Time{}
	s.stopped = make(chan struct{})
	s.mu.Unlock()

	ready := make(chan bool, 1)
	go s.run(ready)
	return <-ready
}

// Stop ends tracking, restores system cursors, and waits for the hook thread.
func (s *Session) Stop() bool {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return false
	}
	tid := s.threadID
	stopped := s.stopped
	s.mu.Unlock()

	if tid != 0 {
		procPostThreadMessageW.Call(uintptr(tid), wmQuit, 0, 0)
	}
	if stopped != nil {
		<-stopped
	}
	return true
}

func (s *Session) run(ready chan bool) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	defer s.finishCleanup()

	lockPickerThreadDpi()

	activeSession = s

	tid, _, _ := procGetCurrentThreadID.Call()
	s.mu.Lock()
	s.threadID = uint32(tid)
	s.mu.Unlock()

	s.installDragIcon()

	hook, _, _ := procSetWindowsHookExW.Call(
		whMouseLL,
		mouseProcAddr,
		win32.GetModuleHandle(),
		0,
	)
	if hook == 0 {
		hook, _, _ = procSetWindowsHookExW.Call(whMouseLL, mouseProcAddr, 0, 0)
	}
	if hook == 0 {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
		ready <- false
		return
	}
	s.hook = hook
	ready <- true

	s.emit(probeCursor(false))
	s.moveOverlay()
	if !keyDown(vkLButton) {
		s.complete()
		return
	}

	var m msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
	}
}

func (s *Session) finishCleanup() {
	if s.hook != 0 {
		procUnhookWindowsHookEx.Call(s.hook)
		s.hook = 0
	}
	s.restoreDragIcon()

	s.mu.Lock()
	s.running = false
	s.completing = false
	s.threadID = 0
	s.callback = nil
	stopped := s.stopped
	s.stopped = nil
	s.mu.Unlock()

	if activeSession == s {
		activeSession = nil
	}
	if stopped != nil {
		close(stopped)
	}
}
