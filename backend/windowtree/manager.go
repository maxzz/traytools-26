package windowtree

import (
	"context"
	"encoding/json"

	"traytools-26-go/backend/bus"
)

// Manager exposes the "Show Windows Tree" feature over the command bus. It is a
// pure request/response service (like toolsmenu): the frontend asks for the
// whole desktop window tree, then requests detailed info for the selected
// window. The Win32 enumeration lives in the platform-specific files.
type Manager struct{}

// New creates a Manager.
func New() *Manager { return &Manager{} }

// Register wires the windowtree command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getTree", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return platformGetTree()
	})
	b.Register(Group, "getWindowInfo", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Handle string `json:"handle"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return platformGetWindowInfo(req.Handle)
	})
	b.Register(Group, "getProcessInfo", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			ProcessID uint32 `json:"processId"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return platformGetProcessInfo(req.ProcessID)
	})
	b.Register(Group, "getActiveWindows", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return platformGetActiveWindows()
	})
}
