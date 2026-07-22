//go:build windows

package winhotkeys

import (
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	// IDUnloadHook is the RegisterHotKey id for "Send unload hook notification".
	IDUnloadHook = 1

	// IDToolBase is added to a tools-menu command id to form its RegisterHotKey id.
	// Tool command ids start at 1, so tool hotkeys use 1001, 1002, …
	IDToolBase = 1000

	wmHotkey     = 0x0312
	wmApp        = 0x8000
	wmSyncHotkey = wmApp + 40

	modAlt      = 0x0001
	modControl  = 0x0002
	modShift    = 0x0004
	modNoRepeat = 0x4000

	hwndMessage = ^uintptr(0) - 2
)

// Chord is Ctrl/Alt/Shift + A–Z, 0–9, number-row punctuation (` - =), or F1–F12.
type Chord struct {
	Ctrl  bool
	Alt   bool
	Shift bool
	Key   string // "A".."Z", "0".."9", "`", "-", "=", or "F1".."F12"
}

type Handler func(id int)

var (
	user32   = windows.NewLazySystemDLL("user32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")

	procRegisterClassExW = user32.NewProc("RegisterClassExW")
	procCreateWindowExW  = user32.NewProc("CreateWindowExW")
	procDefWindowProcW   = user32.NewProc("DefWindowProcW")
	procGetMessageW      = user32.NewProc("GetMessageW")
	procTranslateMessage = user32.NewProc("TranslateMessage")
	procDispatchMessageW = user32.NewProc("DispatchMessageW")
	procPostMessageW     = user32.NewProc("PostMessageW")
	procRegisterHotKey   = user32.NewProc("RegisterHotKey")
	procUnregisterHotKey = user32.NewProc("UnregisterHotKey")
	procGetModuleHandleW = kernel32.NewProc("GetModuleHandleW")
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
	mu          sync.Mutex
	started     bool
	hwnd        uintptr
	handler     Handler
	desired     = map[int]*Chord{}
	active      = map[int]*Chord{} // chords we successfully registered (avoids false conflicts)
	toolOwned   = map[int]bool{}   // RegisterHotKey ids owned by the Tools menu
	pendingDone chan map[int]string
)

// ToolHotkeyID maps a tools-menu command id to a RegisterHotKey id.
func ToolHotkeyID(commandID int) int {
	return IDToolBase + commandID
}

// ToolCommandID reverses ToolHotkeyID. ok is false when id is not a tool hotkey.
func ToolCommandID(hotkeyID int) (commandID int, ok bool) {
	if hotkeyID <= IDToolBase {
		return 0, false
	}
	return hotkeyID - IDToolBase, true
}

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
// Failures are applied asynchronously; prefer ReplaceTools when conflict results are needed.
func Set(id int, chord *Chord) error {
	normalized, err := normalizeChord(chord)
	if err != nil {
		return err
	}

	mu.Lock()
	if normalized == nil {
		delete(desired, id)
	} else {
		cp := *normalized
		desired[id] = &cp
	}
	h := hwnd
	mu.Unlock()

	if h == 0 {
		return nil
	}

	procPostMessageW.Call(h, wmSyncHotkey, 0, 0)
	return nil
}

// ReplaceTools replaces all Tools-menu global hotkey registrations with bindings
// (keyed by RegisterHotKey id, typically from ToolHotkeyID). Ids previously owned
// by tools but absent from bindings are unregistered. Returns a map of id →
// failure reason for bindings that could not be registered. Already-owned chords
// that are unchanged are left in place (no false conflict).
func ReplaceTools(bindings map[int]*Chord) map[int]string {
	failures := map[int]string{}
	normalized := make(map[int]*Chord, len(bindings))
	for id, chord := range bindings {
		c, err := normalizeChord(chord)
		if err != nil {
			failures[id] = err.Error()
			continue
		}
		if c != nil {
			cp := *c
			normalized[id] = &cp
		}
	}

	mu.Lock()
	for id := range toolOwned {
		if _, keep := normalized[id]; !keep {
			delete(desired, id)
		}
	}
	toolOwned = make(map[int]bool, len(normalized))
	for id, c := range normalized {
		cp := *c
		desired[id] = &cp
		toolOwned[id] = true
	}
	h := hwnd
	mu.Unlock()

	if h == 0 {
		// Window not ready yet; messageLoop will sync when created.
		return failures
	}

	for id, msg := range requestSync() {
		if _, ok := normalized[id]; ok || id == -1 {
			failures[id] = msg
		}
	}
	return failures
}

func normalizeChord(chord *Chord) (*Chord, error) {
	if chord == nil {
		return nil, nil
	}
	if err := validate(chord); err != nil {
		return nil, err
	}
	c := *chord
	normalized, err := normalizeKey(c.Key)
	if err != nil {
		return nil, err
	}
	c.Key = normalized
	return &c, nil
}

func requestSync() map[int]string {
	done := make(chan map[int]string, 1)

	mu.Lock()
	pendingDone = done
	h := hwnd
	mu.Unlock()

	if h == 0 {
		return nil
	}

	procPostMessageW.Call(h, wmSyncHotkey, 0, 0)

	select {
	case result := <-done:
		if result == nil {
			return map[int]string{}
		}
		return result
	case <-time.After(2 * time.Second):
		mu.Lock()
		if pendingDone == done {
			pendingDone = nil
		}
		mu.Unlock()
		return map[int]string{-1: "hotkeys: sync timed out"}
	}
}

func validate(c *Chord) error {
	if c == nil {
		return fmt.Errorf("hotkeys: nil chord")
	}
	if !c.Ctrl && !c.Alt && !c.Shift {
		return fmt.Errorf("hotkeys: at least one of Ctrl/Alt/Shift is required")
	}
	if _, err := virtualKey(c.Key); err != nil {
		return err
	}
	return nil
}

func normalizeKey(key string) (string, error) {
	trimmed := strings.TrimSpace(key)
	upper := strings.ToUpper(trimmed)
	if len(upper) == 1 && upper[0] >= 'A' && upper[0] <= 'Z' {
		return upper, nil
	}
	if len(upper) == 1 && upper[0] >= '0' && upper[0] <= '9' {
		return upper, nil
	}
	switch trimmed {
	case "`", "-", "=":
		return trimmed, nil
	}
	if len(upper) >= 2 && upper[0] == 'F' {
		var n int
		if _, err := fmt.Sscanf(upper, "F%d", &n); err == nil && n >= 1 && n <= 12 && upper == fmt.Sprintf("F%d", n) {
			return upper, nil
		}
	}
	return "", fmt.Errorf("hotkeys: key must be A–Z, 0–9, ` - =, or F1–F12")
}

// virtualKey maps a chord key to a Win32 virtual-key code.
func virtualKey(key string) (uintptr, error) {
	normalized, err := normalizeKey(key)
	if err != nil {
		return 0, err
	}
	if len(normalized) == 1 {
		switch normalized {
		case "`":
			return 0xC0, nil // VK_OEM_3
		case "-":
			return 0xBD, nil // VK_OEM_MINUS
		case "=":
			return 0xBB, nil // VK_OEM_PLUS
		default:
			// VK_A..VK_Z and VK_0..VK_9 share ASCII codes.
			return uintptr(normalized[0]), nil
		}
	}
	// VK_F1 = 0x70 … VK_F12 = 0x7B
	var n int
	if _, err := fmt.Sscanf(normalized, "F%d", &n); err != nil || n < 1 || n > 12 {
		return 0, fmt.Errorf("hotkeys: key must be A–Z, 0–9, ` - =, or F1–F12")
	}
	return uintptr(0x70 + (n - 1)), nil
}

// Parse accepts "Ctrl+Alt+U" / "Ctrl+1" / "Ctrl+F5" style strings (same as the frontend formatter).
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
			if c.Key != "" {
				return nil, fmt.Errorf("hotkeys: invalid token %q", p)
			}
			normalized, err := normalizeKey(p)
			if err != nil {
				return nil, fmt.Errorf("hotkeys: invalid token %q", p)
			}
			c.Key = normalized
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
		parts = append(parts, c.Key)
	}
	return strings.Join(parts, "+")
}

func chordsEqual(a, b *Chord) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Ctrl == b.Ctrl && a.Alt == b.Alt && a.Shift == b.Shift && a.Key == b.Key
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

	_ = syncRegistrations()

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
		failures := syncRegistrations()
		mu.Lock()
		done := pendingDone
		pendingDone = nil
		mu.Unlock()
		if done != nil {
			done <- failures
		}
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

func syncRegistrations() map[int]string {
	failures := map[int]string{}

	mu.Lock()
	h := hwnd
	want := make(map[int]*Chord, len(desired))
	for id, c := range desired {
		cp := *c
		want[id] = &cp
	}
	mu.Unlock()

	if h == 0 {
		return failures
	}

	// Detect duplicate chords among desired bindings before touching the OS.
	seen := map[string]int{}
	for id, c := range want {
		key := Format(c)
		if other, ok := seen[key]; ok {
			failures[id] = fmt.Sprintf("already assigned within this app (also used by binding %d)", other)
			delete(want, id)
			continue
		}
		seen[key] = id
	}

	// Unregister removed ids.
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
		current := active[id]
		mu.Unlock()

		// Already registered with the same chord — leave it alone.
		if chordsEqual(current, c) {
			continue
		}

		if current != nil {
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
		vk, err := virtualKey(c.Key)
		if err != nil {
			failures[id] = err.Error()
			log.Printf("hotkeys: %v", err)
			continue
		}

		ret, _, callErr := procRegisterHotKey.Call(h, uintptr(id), uintptr(mods), vk)
		if ret == 0 {
			msg := fmt.Sprintf("RegisterHotKey(%s) failed: %v", Format(c), callErr)
			failures[id] = msg
			log.Printf("hotkeys: %s", msg)
			continue
		}
		cp := *c
		mu.Lock()
		active[id] = &cp
		mu.Unlock()
	}

	return failures
}
