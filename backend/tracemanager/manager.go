package tracemanager

import (
	"context"
	"encoding/json"
	"sync"
	"sync/atomic"
	"time"

	"tm-template-go-26/backend/bus"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Bus group and event names shared with the frontend bridge.
const (
	Group = "tracemanager"

	EventTraceCall = "tracemanager:tracecall"
	EventStreaming = "tracemanager:streaming"
)

// Manager owns the trace streaming lifecycle and routes category get/save
// through the platform layer. It is the Go analogue of the legacy
// CTraceManager facade.
type Manager struct {
	ctx context.Context

	seq uint64 // atomic

	mu          sync.Mutex
	streaming   bool
	demoStop    chan struct{}
	captureStop func()
}

// New creates a Manager. Start must be called with the Wails context before any
// events can be emitted.
func New() *Manager {
	return &Manager{}
}

// Start binds the Wails context used to emit runtime events.
func (m *Manager) Start(ctx context.Context) {
	m.ctx = ctx
}

// Register wires the tracemanager command group onto the bus.
func (m *Manager) Register(b *bus.Bus) {
	b.Register(Group, "getCategories", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return platformLoadCategories()
	})

	b.Register(Group, "saveCategories", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Sections []SectionDescription `json:"sections"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		if err := platformSaveCategories(req.Sections); err != nil {
			return nil, err
		}
		// Return the re-read state so the UI reflects what was actually stored.
		return platformLoadCategories()
	})

	b.Register(Group, "openRegedit", func(ctx context.Context, payload json.RawMessage) (any, error) {
		var req struct {
			Target string `json:"target"`
		}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		return nil, platformOpenRegedit(req.Target)
	})

	b.Register(Group, "exportTrace", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, platformRunTrace("exp")
	})

	b.Register(Group, "importTrace", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return nil, platformRunTrace("imp")
	})

	b.Register(Group, "startStream", func(ctx context.Context, payload json.RawMessage) (any, error) {
		req := struct {
			Demo bool `json:"demo"`
		}{Demo: true}
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &req); err != nil {
				return nil, err
			}
		}
		m.startStream(req.Demo)
		return m.status(), nil
	})

	b.Register(Group, "stopStream", func(ctx context.Context, payload json.RawMessage) (any, error) {
		m.stopStream()
		return m.status(), nil
	})

	b.Register(Group, "getStatus", func(ctx context.Context, payload json.RawMessage) (any, error) {
		return m.status(), nil
	})
}

// Shutdown stops any running stream. Safe to call multiple times.
func (m *Manager) Shutdown() {
	m.stopStream()
}

func (m *Manager) status() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"streaming": m.streaming,
	}
}

// emit stamps a trace call with a sequence number and timestamp, then forwards
// it to the frontend. It is safe to call from any goroutine.
func (m *Manager) emit(call TraceCall) {
	call.Seq = atomic.AddUint64(&m.seq, 1)
	call.TimeMs = time.Now().UnixMilli()
	if m.ctx != nil {
		runtime.EventsEmit(m.ctx, EventTraceCall, call)
	}
}

func (m *Manager) startStream(demo bool) {
	m.mu.Lock()
	if m.streaming {
		m.mu.Unlock()
		return
	}
	m.streaming = true

	// Best-effort real capture from the shared-memory IPC channel. When no
	// producer exists (or on non-Windows) this is a no-op.
	if stop, err := platformStartCapture(m.emit); err == nil {
		m.captureStop = stop
	}

	if demo {
		stop := make(chan struct{})
		m.demoStop = stop
		go m.runDemo(stop)
	}
	m.mu.Unlock()

	if m.ctx != nil {
		runtime.EventsEmit(m.ctx, EventStreaming, true)
	}
}

func (m *Manager) stopStream() {
	m.mu.Lock()
	if !m.streaming {
		m.mu.Unlock()
		return
	}
	m.streaming = false
	if m.demoStop != nil {
		close(m.demoStop)
		m.demoStop = nil
	}
	if m.captureStop != nil {
		m.captureStop()
		m.captureStop = nil
	}
	m.mu.Unlock()

	if m.ctx != nil {
		runtime.EventsEmit(m.ctx, EventStreaming, false)
	}
}
