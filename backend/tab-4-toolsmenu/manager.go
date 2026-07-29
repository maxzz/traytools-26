package toolsmenu

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"traytools-26-go/backend/bus"
	"traytools-26-go/backend/winhotkeys"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Group is the bus group name shared with the frontend bridge.
const Group = "tools"

// Manager owns the parsed Tools menu and the id -> command map used to run a
// selected entry. getMenu rebuilds both; exec looks up by id.
type Manager struct {
	ctx      context.Context
	mu       sync.Mutex
	commands map[int]resolvedCommand
}

// New creates an empty Manager.
func New() *Manager {
	return &Manager{commands: map[int]resolvedCommand{}}
}

// Start binds the Wails context used for native open/save dialogs.
func (m *Manager) Start(ctx context.Context) {
	m.ctx = ctx
}

// Register wires the tools command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getMenu", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.getMenu(), nil
	})
	b.Register(Group, "exec", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			ID int `json:"id"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return nil, m.exec(req.ID)
	})
	b.Register(Group, "getRaw", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.getRaw(), nil
	})
	b.Register(Group, "save", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Content string `json:"content"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		path, err := saveRawConfig(req.Content)
		if err != nil {
			return nil, err
		}
		return SaveResponse{Path: path}, nil
	})
	b.Register(Group, "openPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.openPath()
	})
	b.Register(Group, "saveAsPath", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			DefaultFilename string `json:"defaultFilename"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return m.saveAsPath(req.DefaultFilename)
	})
	b.Register(Group, "readTextFile", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Path string `json:"path"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		data, err := os.ReadFile(req.Path)
		if err != nil {
			return nil, err
		}
		return map[string]string{"content": string(data)}, nil
	})
	b.Register(Group, "writeTextFile", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := os.MkdirAll(filepath.Dir(req.Path), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(req.Path, []byte(req.Content), 0o644); err != nil {
			return nil, err
		}
		return SaveResponse{Path: req.Path}, nil
	})
	b.Register(Group, "syncHotkeys", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.SyncHotkeys(), nil
	})
}

func (m *Manager) openPath() (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("tools: not started")
	}
	path, err := runtime.OpenFileDialog(m.ctx, runtime.OpenDialogOptions{
		Title: "Open tools menu",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON (*.json)", Pattern: "*.json"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

func (m *Manager) saveAsPath(defaultFilename string) (PickResponse, error) {
	if m.ctx == nil {
		return PickResponse{}, fmt.Errorf("tools: not started")
	}
	if defaultFilename == "" {
		defaultFilename = "tools.json"
	}
	path, err := runtime.SaveFileDialog(m.ctx, runtime.SaveDialogOptions{
		Title:           "Save tools menu as",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON (*.json)", Pattern: "*.json"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return PickResponse{}, err
	}
	if path == "" {
		return PickResponse{Canceled: true}, nil
	}
	return PickResponse{Path: filepath.ToSlash(path)}, nil
}

// getRaw returns the unparsed tools.json text for the editor.
func (m *Manager) getRaw() RawResponse {
	content, path, found, err := readRawConfig()
	if err != nil {
		return RawResponse{Found: found, Path: path, Error: err.Error()}
	}
	return RawResponse{Found: found, Path: path, Content: content}
}

// getMenu loads tools.json, rebuilds the render tree, and refreshes the id map.
func (m *Manager) getMenu() MenuResponse {
	path, found := findConfigPath()
	if !found {
		m.mu.Lock()
		m.commands = map[int]resolvedCommand{}
		m.mu.Unlock()
		return MenuResponse{Found: false}
	}

	cfg, baseDir, err := loadConfig(path)
	if err != nil {
		m.mu.Lock()
		m.commands = map[int]resolvedCommand{}
		m.mu.Unlock()
		return MenuResponse{Found: true, Path: path, Error: err.Error()}
	}

	commands := map[int]resolvedCommand{}
	next := 1
	root := buildView(cfg.Menu, baseDir, commands, &next)

	m.mu.Lock()
	m.commands = commands
	m.mu.Unlock()

	return MenuResponse{Found: true, Path: path, Root: root}
}

// exec runs the command previously registered under id.
func (m *Manager) exec(id int) error {
	m.mu.Lock()
	cmd, ok := m.commands[id]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("tools: unknown command id %d", id)
	}

	switch cmd.what {
	case whatReg:
		return platformOpenRegistry(cmd.path, cmd.plat, cmd.elevated)
	default:
		return platformExecTool(cmd.path, cmd.args, cmd.elevated)
	}
}

// buildView converts a MenuNode into a MenuView, assigning ids to command
// leaves and recording their resolved form. next is a shared counter so ids are
// unique across the whole tree.
func buildView(n MenuNode, baseDir string, commands map[int]resolvedCommand, next *int) *MenuView {
	name := n.MenuName

	// Sub-menu: has child items.
	if len(n.MenuItems) > 0 {
		view := &MenuView{Name: name, Kind: KindSubmenu}
		for _, child := range n.MenuItems {
			cv := buildView(child, baseDir, commands, next)
			if cv != nil {
				view.Children = append(view.Children, *cv)
			}
		}
		// Drop empty sub-menus.
		if len(view.Children) == 0 {
			return nil
		}
		return view
	}

	// Separator.
	if strings.TrimSpace(name) == "-" {
		return &MenuView{Name: "-", Kind: KindSeparator}
	}

	// Command leaf: must have a cmdLine.
	if strings.TrimSpace(n.CmdLine) == "" {
		return nil
	}

	cmd := resolveCommand(baseDir, n)
	id := *next
	*next++
	commands[id] = cmd

	return &MenuView{
		Name:         name,
		Kind:         KindItem,
		ID:           id,
		What:         cmd.what,
		HotKey:       n.HotKey,
		HotKeyGlobal: n.HotKeyGlobal,
	}
}

// SyncHotkeys reloads tools.json, registers global tool winhotkeys, and returns
// local bindings plus any registration conflicts. Safe to call at startup and
// after the editor Apply action.
func (m *Manager) SyncHotkeys() HotkeySyncResponse {
	resp := m.getMenu()
	bindings := collectHotkeyBindings(resp.Root)

	local := make([]HotkeyBinding, 0)
	global := make([]HotkeyBinding, 0)
	for _, b := range bindings {
		if b.Global {
			global = append(global, b)
		} else {
			local = append(local, b)
		}
	}

	// Stable order so duplicate-chord conflict winners are deterministic.
	sort.Slice(global, func(i, j int) bool { return global[i].ID < global[j].ID })

	want := map[int]*winhotkeys.Chord{}
	meta := map[int]HotkeyBinding{}
	var conflicts []HotkeyConflict

	for _, b := range global {
		chord, err := winhotkeys.Parse(b.HotKey)
		if err != nil {
			conflicts = append(conflicts, HotkeyConflict{
				ID: b.ID, Name: b.Name, HotKey: b.HotKey, Error: err.Error(),
			})
			continue
		}
		if chord == nil {
			continue
		}
		hkID := winhotkeys.ToolHotkeyID(b.ID)
		want[hkID] = chord
		meta[hkID] = b
	}

	for id, msg := range winhotkeys.ReplaceTools(want) {
		if id < 0 {
			conflicts = append(conflicts, HotkeyConflict{Error: msg})
			continue
		}
		b := meta[id]
		conflicts = append(conflicts, HotkeyConflict{
			ID: b.ID, Name: b.Name, HotKey: b.HotKey, Error: msg,
		})
	}

	return HotkeySyncResponse{Local: local, Global: global, Conflicts: conflicts}
}

func collectHotkeyBindings(root *MenuView) []HotkeyBinding {
	if root == nil {
		return nil
	}
	var out []HotkeyBinding
	var walk func(MenuView)
	walk = func(n MenuView) {
		if n.Kind == KindItem && strings.TrimSpace(n.HotKey) != "" && n.ID != 0 {
			out = append(out, HotkeyBinding{
				ID:     n.ID,
				Name:   n.Name,
				HotKey: n.HotKey,
				Global: n.HotKeyGlobal,
			})
		}
		for _, child := range n.Children {
			walk(child)
		}
	}
	walk(*root)
	return out
}
