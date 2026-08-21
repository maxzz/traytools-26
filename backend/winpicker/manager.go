package winpicker

import (
	"context"
	"encoding/json"

	"traytools-26-go/backend/bus"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Bus group shared with the frontend bridge (groups/winpicker.ts).
const Group = "winpicker"

// EventWindowPicker is streamed while the window-finder drag is active.
const EventWindowPicker = "winpicker:event"

// Manager exposes the Spy++-style window finder over the command bus.
// Move/up payloads are emitted as EventWindowPicker JSON strings.
type Manager struct {
	ctx    context.Context
	picker *Session
}

// New creates a Manager.
func New() *Manager {
	return &Manager{picker: NewSession()}
}

// Start binds the Wails context used for EventsEmit.
func (m *Manager) Start(ctx context.Context) {
	m.ctx = ctx
}

// Shutdown cancels an in-progress finder drag.
func (m *Manager) Shutdown() {
	if m.picker != nil {
		m.picker.Stop()
	}
}

// Register wires the winpicker command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "start", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			IconMode string `json:"iconMode"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		ok := m.picker.Start(func(data string) {
			if m.ctx != nil {
				runtime.EventsEmit(m.ctx, EventWindowPicker, data)
			}
		}, ParseDragIconMode(req.IconMode))
		return ok, nil
	})
	b.Register(Group, "stop", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.picker.Stop(), nil
	})
}
