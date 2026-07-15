//go:build windows

package hotkeys

import (
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	// IDUnloadHook is the RegisterHotKey id for "Send unload hook notification".
	IDUnloadHook = 1

	wmHotkey     = 0x0312
	wmApp        = 0x8000
	wmSyncHotkey = wmApp + 40

	modAlt     = 0x0001
	modControl = 0x0002
	modShift   = 0x0004
	modNoRepeat = 0x4000

	hwndMessage = ^uintptr(0) - 2
)

// Chord is Ctrl/Alt/Shift + one A–Z letter.
type Chord struct {
	Ctrl  bool
	Alt   bool
	Shift bool
	Key   string // "A".."Z"
}

type Handler func(id int)

var (
	user32   = windows.NewLazySystemDLL("user32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")

	procRegisterClassExW   = user32.NewProc("RegisterClassExW")
	procCreateWindowExW    = user32.NewProc("CreateWindowExW")
	procDefWindowProcW     = user32.NewProc("DefWindowProcW")
	procGetMessageW        = user32.NewProc("GetMessageW")
	procTranslateMessage   = user32.NewProc("TranslateMessage")
	procDispatchMessageW   = user32.NewProc("DispatchMessageW")
	procPostMessageW       = user32.NewProc("PostMessageW")
	procRegisterHotKey     = user32.NewProc("RegisterHotKey")
	procUnregisterHotKey   = user32.NewProc("UnregisterHotKey")
	procGetModuleHandleW   = kernel32.NewProc("GetModuleHandleW")
)

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

type msg struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      struct{ X, Y int32 }
}

var (
	mu       sync.Mutex
	started  bool
	hwnd     uintptr
	handler  Handler
	desired  = map[int]*Chord{}
	active   = map[int]bool{}
)

// Start launches the dedicated hotkey message-loop thread. Safe to call once.
func Start(h Handler) {
	mu.Lock()
	if started {
		handler = h
		mu.Unlock()
		return
	}
	started = true
	handler = h
	mu.Unlock()

	go messageLoop()
}

// Set registers or clears a global hotkey id. A nil / empty chord unregisters.
func Set(id int, chord *Chord) error {
	if chord != nil {
		if err := validate(chord); err != nil {
			return err
		}
		c := *chord
		c.Key = strings.ToUpper(c.Key)
		chord = &c
	}

	mu.Lock()
	if chord == nil {
		delete(desired, id)
	} else {
		cp := *chord
		desired[id] = &cp
	}
	h := hwnd
	mu.Unlock()

	if h == 0 {
		// Window not ready yet; messageLoop will sync when created.
		return nil
	}

	procPostMessageW.Call(h, wmSyncHotkey, 0, 0)
	return nil
}

func validate(c *Chord) error {
	if c == nil {
		return fmt.Errorf("hotkeys: nil chord")
	}
	if !c.Ctrl && !c.Alt && !c.Shift {
		return fmt.Errorf("hotkeys: at least one of Ctrl/Alt/Shift is required")
	}
	key := strings.ToUpper(c.Key)
	if len(key) != 1 || key[0] < 'A' || key[0] > 'Z' {
		return fmt.Errorf("hotkeys: key must be A–Z")
	}
	return nil
}

// Parse accepts "Ctrl+Alt+U" style strings (same as the frontend formatter).
func Parse(text string) (*Chord, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, nil
	}
	parts := strings.Split(text, "+")
	c := &Chord{}
	for _, p := range parts {
		p = strings.TrimSpace(p)
		upper := strings.ToUpper(p)
		switch upper {
		case "CTRL", "CONTROL":
			c.Ctrl = true
		case "ALT":
			c.Alt = true
		case "SHIFT":
			c.Shift = true
		default:
			if len(upper) == 1 && upper[0] >= 'A' && upper[0] <= 'Z' && c.Key == "" {
				c.Key = upper
			} else {
				return nil, fmt.Errorf("hotkeys: invalid token %q", p)
			}
		}
	}
	if err := validate(c); err != nil {
		return nil, err
	}
	return c, nil
}

func Format(c *Chord) string {
	if c == nil {
		return ""
	}
	var parts []string
	if c.Ctrl {
		parts = append(parts, "Ctrl")
	}
	if c.Alt {
		parts = append(parts, "Alt")
	}
	if c.Shift {
		parts = append(parts, "Shift")
	}
	if c.Key != "" {
		parts = append(parts, strings.ToUpper(c.Key))
	}
	return strings.Join(parts, "+")
}

func messageLoop() {
	runtime.LockOSThread()

	className, err := windows.UTF16PtrFromString("traytools-26-hotkeys")
	if err != nil {
		log.Printf("hotkeys: class name: %v", err)
		return
	}

	wndProc := syscall.NewCallback(windowProc)
	moduleHandle, _, _ := procGetModuleHandleW.Call(0)

	class := wndClassEx{
		Size:      uint32(unsafe.Sizeof(wndClassEx{})),
		WndProc:   wndProc,
		Instance:  moduleHandle,
		ClassName: className,
	}
	if ret, _, _ := procRegisterClassExW.Call(uintptr(unsafe.Pointer(&class))); ret == 0 {
		log.Printf("hotkeys: RegisterClassEx failed")
		return
	}

	h, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		0,
		0,
		0, 0, 0, 0,
		hwndMessage,
		0,
		moduleHandle,
		0,
	)
	if h == 0 {
		log.Printf("hotkeys: CreateWindowEx failed")
		return
	}

	mu.Lock()
	hwnd = h
	mu.Unlock()

	syncRegistrations()

	var m msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if int32(ret) <= 0 {
			return
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
		procDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
	}
}

func windowProc(h, msg, wparam, lparam uintptr) uintptr {
	switch msg {
	case wmSyncHotkey:
		syncRegistrations()
		return 0
	case wmHotkey:
		mu.Lock()
		hnd := handler
		mu.Unlock()
		if hnd != nil {
			id := int(wparam)
			go hnd(id)
		}
		return 0
	}
	ret, _, _ := procDefWindowProcW.Call(h, msg, wparam, lparam)
	return ret
}

func syncRegistrations() {
	mu.Lock()
	h := hwnd
	want := make(map[int]*Chord, len(desired))
	for id, c := range desired {
		cp := *c
		want[id] = &cp
	}
	mu.Unlock()

	if h == 0 {
		return
	}

	// Unregister removed / changed ids.
	mu.Lock()
	for id := range active {
		if _, ok := want[id]; !ok {
			procUnregisterHotKey.Call(h, uintptr(id))
			delete(active, id)
		}
	}
	mu.Unlock()

	for id, c := range want {
		mu.Lock()
		already := active[id]
		mu.Unlock()
		if already {
			procUnregisterHotKey.Call(h, uintptr(id))
			mu.Lock()
			delete(active, id)
			mu.Unlock()
		}

		mods := uint32(modNoRepeat)
		if c.Ctrl {
			mods |= modControl
		}
		if c.Alt {
			mods |= modAlt
		}
		if c.Shift {
			mods |= modShift
		}
		vk := uintptr(c.Key[0])

		ret, _, callErr := procRegisterHotKey.Call(h, uintptr(id), uintptr(mods), vk)
		if ret == 0 {
			log.Printf("hotkeys: RegisterHotKey(%d, %s) failed: %v", id, Format(c), callErr)
			continue
		}
		mu.Lock()
		active[id] = true
		mu.Unlock()
	}
}
