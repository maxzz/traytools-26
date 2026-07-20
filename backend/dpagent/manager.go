package dpagent

import (
	"context"
	"encoding/json"
	"time"

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
	// ensureStopped is used by copy operations: stop DPAgent and wait until it
	// is confirmed gone (see copy_ops_stop.go).
	b.Register(Group, "ensureStopped", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			TimeoutMs int `json:"timeoutMs"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		timeout := DefaultEnsureStoppedTimeout
		if req.TimeoutMs > 0 {
			timeout = time.Duration(req.TimeoutMs) * time.Millisecond
		}
		return nil, EnsureStopped(timeout)
	})
}
