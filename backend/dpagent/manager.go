package dpagent

import (
	"context"
	"encoding/json"

	"traytools-26-go/backend/bus"
)

// Manager exposes DPAgent start/stop/status over the command bus.
type Manager struct{}

// New creates a Manager.
func New() *Manager { return &Manager{} }

// Register wires the dpagent command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getStatus", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return platformGetStatus()
	})
	b.Register(Group, "start", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			AsHigh bool `json:"asHigh"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return nil, platformStart(req.AsHigh)
	})
	b.Register(Group, "stop", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, platformStop()
	})
}
