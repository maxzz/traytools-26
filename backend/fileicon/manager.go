package fileicon

import (
	"context"
	"encoding/json"

	"traytools-26-go/backend/bus"
)

// Manager exposes file-icon extraction over the command bus so any tab can
// request PNG data URLs for executable / .ico paths.
type Manager struct{}

// New creates a Manager.
func New() *Manager { return &Manager{} }

type getFileIconsRequest struct {
	Paths []string `json:"paths"`
}

// Register wires the fileicon command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getFileIcons", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req getFileIconsRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return ExtractMany(req.Paths), nil
	})
}
