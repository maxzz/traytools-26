package toolsmenu

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"

	"tm-template-go-26/backend/bus"
)

// Group is the bus group name shared with the frontend bridge.
const Group = "tools"

// Manager owns the parsed Tools menu and the id -> command map used to run a
// selected entry. getMenu rebuilds both; exec looks up by id.
type Manager struct {
	mu       sync.Mutex
	commands map[int]resolvedCommand
}

// New creates an empty Manager.
func New() *Manager {
	return &Manager{commands: map[int]resolvedCommand{}}
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
		Name:   name,
		Kind:   KindItem,
		ID:     id,
		What:   cmd.what,
		HotKey: n.HotKey,
	}
}
