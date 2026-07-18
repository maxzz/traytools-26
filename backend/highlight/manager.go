package highlight

import (
	"context"
	"encoding/json"
	"sync"

	"traytools-26-go/backend/bus"
)

// Manager exposes screen rectangle highlighting over the command bus.
type Manager struct {
	mu          sync.Mutex
	highlighter platformHighlighter
}

// New creates a Manager.
func New() *Manager { return &Manager{} }

// Register wires the highlight command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "highlightRect", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req HighlightRectRequest
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		m.ensureHighlighter().Highlight(HighlightParams{
			Left:        req.Left,
			Top:         req.Top,
			Right:       req.Right,
			Bottom:      req.Bottom,
			ColorRGB:    req.Color,
			BorderWidth: req.BorderWidth,
			BlinkCount:  req.BlinkCount,
		})
		return nil, nil
	})
	b.Register(Group, "hide", func(ctx context.Context, payload json.RawMessage) (any, error) {
		m.ensureHighlighter().Hide()
		return nil, nil
	})
}

func (m *Manager) ensureHighlighter() platformHighlighter {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.highlighter == nil {
		m.highlighter = newHighlighter()
	}
	return m.highlighter
}

// platformHighlighter is implemented by the OS-specific overlay.
type platformHighlighter interface {
	Highlight(p HighlightParams)
	Hide()
}
