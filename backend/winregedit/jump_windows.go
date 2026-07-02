//go:build windows

// Package winregedit opens the Windows Registry Editor and navigates it to a
// specific key (and optionally a value). It is a Go port of the legacy
// regeditutils::regeditjump (atl_regedit_utils.h).
//
// Two mechanisms are combined so navigation is reliable in every state:
//
//   - LastKey fast path: regedit restores the key stored in
//     HKCU\...\Applets\Regedit\LastKey on startup, so a freshly launched
//     regedit lands on the target immediately.
//   - Keystroke navigation: when a regedit window is already open it ignores
//     LastKey (relaunching only re-activates the existing window). We therefore
//     drive its tree view directly with WM_KEYDOWN/WM_CHAR messages — collapse
//     to the root, then expand/type down the path — exactly like the original
//     regeditapp_t did. This also reinforces the fresh-launch case.
package winregedit

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	user32            = windows.NewLazySystemDLL("user32.dll")
	procFindWindowW   = user32.NewProc("FindWindowW")
	procFindWindowExW = user32.NewProc("FindWindowExW")
	procSendMessageW  = user32.NewProc("SendMessageW")
	procSetForeground = user32.NewProc("SetForegroundWindow")
	procSetFocus      = user32.NewProc("SetFocus")
	procShowWindow    = user32.NewProc("ShowWindow")
)

const (
	wmKeyDown = 0x0100
	wmChar    = 0x0102

	vkHome  = 0x24
	vkLeft  = 0x25
	vkRight = 0x27

	swNormal = 1

	regeditClass = "RegEdit_RegEdit"

	// Pacing between tree operations. Regedit needs a moment to populate a key's
	// children before the next typed prefix can match, mirroring the original's
	// REGEDITSLOWWAIT throttle on high-color displays.
	stepDelay      = 150 * time.Millisecond
	collapseDelay  = 200 * time.Millisecond
	settleExisting = 200 * time.Millisecond
	settleFresh    = 700 * time.Millisecond
)

type hive struct {
	short string
	long  string
	root  registry.Key
}

var hives = []hive{
	{"HKLM", "HKEY_LOCAL_MACHINE", registry.LOCAL_MACHINE},
	{"HKCU", "HKEY_CURRENT_USER", registry.CURRENT_USER},
	{"HKCR", "HKEY_CLASSES_ROOT", registry.CLASSES_ROOT},
	{"HKCC", "HKEY_CURRENT_CONFIG", registry.CURRENT_CONFIG},
	{"HKU", "HKEY_USERS", registry.USERS},
}

// Jump opens regedit and navigates to keyPath. The hive may be given in short
// (HKLM, HKCU, HKCR, HKCC, HKU) or long (HKEY_LOCAL_MACHINE, ...) form, with
// forward or back slashes. If the final segment names a value rather than a key,
// that value is selected in the right-hand pane.
func Jump(keyPath string) error {
	hv, rest, err := splitHive(keyPath)
	if err != nil {
		return err
	}

	// Decide whether the path ends at a key or a value: if the whole path opens
	// as a key it is a key; otherwise the last segment is treated as a value.
	subkey, value := rest, ""
	if !keyExists(hv.root, rest) {
		if i := strings.LastIndexByte(rest, '\\'); i >= 0 {
			subkey, value = rest[:i], rest[i+1:]
		}
	}

	// Canonical key path (never includes a value) for the LastKey fast path.
	canon := hv.long
	if subkey != "" {
		canon += `\` + subkey
	}
	writeLastKey(canon)

	// Keystroke path: leading backslash + long hive + \subkey, and a trailing
	// backslash so the final key gets expanded too.
	regPath := `\` + hv.long
	if subkey != "" {
		regPath += `\` + subkey
	}
	regPath += `\`

	return navigate(regPath, value)
}

// splitHive normalises slashes, strips a leading backslash, and resolves the
// hive prefix, returning the hive and the remaining sub-path (no leading slash).
func splitHive(key string) (hive, string, error) {
	key = strings.TrimSpace(key)
	key = strings.ReplaceAll(key, "/", `\`)
	key = strings.TrimPrefix(key, `\`)
	if key == "" {
		return hive{}, "", fmt.Errorf("winregedit: empty registry key")
	}

	head, rest := key, ""
	if i := strings.IndexByte(key, '\\'); i >= 0 {
		head, rest = key[:i], key[i+1:]
	}

	up := strings.ToUpper(head)
	for _, hv := range hives {
		if up == hv.short || up == hv.long {
			return hv, rest, nil
		}
	}
	return hive{}, "", fmt.Errorf("winregedit: unknown registry root %q", head)
}

func keyExists(root registry.Key, subkey string) bool {
	if subkey == "" {
		return true
	}
	k, err := registry.OpenKey(root, subkey, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	k.Close()
	return true
}

func writeLastKey(canonKey string) {
	k, _, err := registry.CreateKey(registry.CURRENT_USER,
		`Software\Microsoft\Windows\CurrentVersion\Applets\Regedit`, registry.SET_VALUE)
	if err != nil {
		return
	}
	k.SetStringValue("LastKey", `Computer\`+canonKey)
	k.Close()
}

// navigate ensures a regedit window exists, then drives its tree view (and list
// view for a value) via window messages.
func navigate(regPath, value string) error {
	main := findWindow(regeditClass)
	fresh := false
	if main == 0 {
		if err := exec.Command("regedit.exe").Start(); err != nil {
			return fmt.Errorf("winregedit: failed to launch regedit: %w", err)
		}
		fresh = true

		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			time.Sleep(stepDelay)
			if main = findWindow(regeditClass); main != 0 {
				break
			}
		}
		if main == 0 {
			return fmt.Errorf("winregedit: regedit window did not appear")
		}
	}

	// Let regedit settle. A fresh instance needs longer because it is still
	// restoring LastKey; collapsing to the root next makes that state irrelevant.
	if fresh {
		time.Sleep(settleFresh)
	} else {
		time.Sleep(settleExisting)
	}

	tree := findWindowEx(main, 0, "SysTreeView32")
	list := findWindowEx(main, 0, "SysListView32")
	if tree == 0 {
		return fmt.Errorf("winregedit: could not find the regedit tree view")
	}

	showWindow(main, swNormal)
	setForegroundWindow(main)

	setForegroundWindow(tree)
	setFocus(tree)

	// Collapse everything back to the root (enough for 30 nested levels).
	for i := 0; i < 30; i++ {
		sendMessage(tree, wmKeyDown, vkLeft, 0)
	}
	time.Sleep(collapseDelay)

	// Walk down: VK_RIGHT expands on each separator, typed characters select the
	// next node by incremental prefix search.
	for i := 0; i < len(regPath); i++ {
		if regPath[i] == '\\' {
			sendMessage(tree, wmKeyDown, vkRight, 0)
			time.Sleep(stepDelay)
			continue
		}
		sendMessage(tree, wmChar, uintptr(toUpper(regPath[i])), 0)
	}

	// Select the value in the list view, if the path pointed at one.
	if value != "" && list != 0 {
		setForegroundWindow(list)
		setFocus(list)
		time.Sleep(stepDelay)
		sendMessage(list, wmKeyDown, vkHome, 0)
		for i := 0; i < len(value); i++ {
			sendMessage(list, wmChar, uintptr(toUpper(value[i])), 0)
		}
	}

	setForegroundWindow(main)
	setFocus(main)
	return nil
}

// ---------------------------------------------------------------------------
// Thin user32 wrappers

func toUpper(c byte) byte {
	if c >= 'a' && c <= 'z' {
		return c - ('a' - 'A')
	}
	return c
}

func findWindow(class string) uintptr {
	p, err := windows.UTF16PtrFromString(class)
	if err != nil {
		return 0
	}
	h, _, _ := procFindWindowW.Call(uintptr(unsafe.Pointer(p)), 0)
	return h
}

func findWindowEx(parent, after uintptr, class string) uintptr {
	p, err := windows.UTF16PtrFromString(class)
	if err != nil {
		return 0
	}
	h, _, _ := procFindWindowExW.Call(parent, after, uintptr(unsafe.Pointer(p)), 0)
	return h
}

func sendMessage(hwnd uintptr, msg uint32, wParam, lParam uintptr) uintptr {
	r, _, _ := procSendMessageW.Call(hwnd, uintptr(msg), wParam, lParam)
	return r
}

func setForegroundWindow(hwnd uintptr) { procSetForeground.Call(hwnd) }
func setFocus(hwnd uintptr)            { procSetFocus.Call(hwnd) }
func showWindow(hwnd uintptr, cmd int) { procShowWindow.Call(hwnd, uintptr(cmd)) }
