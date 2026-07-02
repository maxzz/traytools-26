package tracemanager

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"tm-template-go-26/backend/bus"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// EventTraceCall is the Wails event name carrying a single TraceCall to the
// frontend. The legacy code forwarded each tracecall_t to the matching
// CTraceWindow; here the frontend routes by ProcessID instead.
const EventTraceCall = "tracemanager:tracecall"

// Manager owns the trace-manager backend state: the streaming goroutine and
// the cached ctx needed to emit Wails events from that goroutine.
type Manager struct {
	mu        sync.Mutex
	ctx       context.Context
	streaming bool
	stopCh    chan struct{}
}

// New creates an idle Manager. Streaming is off until the frontend asks for it.
func New() *Manager {
	return &Manager{}
}

// Start captures the Wails context so the streaming goroutine can emit events.
// Called from App.Startup.
func (m *Manager) Start(ctx context.Context) {
	m.mu.Lock()
	m.ctx = ctx
	m.mu.Unlock()
}

// Register wires the "tracemanager" command group onto the bus. Each command
// mirrors a button or behavior from the legacy CTraceManagerDlg /
// CTraceCheckboxesCtrl.
func (m *Manager) Register(b *bus.Bus) {
	b.Register("tracemanager", "getCategories", m.handleGetCategories)
	b.Register("tracemanager", "saveCategories", m.handleSaveCategories)
	b.Register("tracemanager", "openRegedit", m.handleOpenRegedit)
	b.Register("tracemanager", "exportTrace", m.handleExportTrace)
	b.Register("tracemanager", "importTrace", m.handleImportTrace)
	b.Register("tracemanager", "startStream", m.handleStartStream)
	b.Register("tracemanager", "stopStream", m.handleStopStream)
}

// ---- handlers ---------------------------------------------------------------

func (m *Manager) handleGetCategories(_ context.Context, _ json.RawMessage) (any, error) {
	return loadCategories()
}

func (m *Manager) handleSaveCategories(_ context.Context, payload json.RawMessage) (any, error) {
	var sections []SectionDescription
	if err := json.Unmarshal(payload, &sections); err != nil {
		return nil, fmt.Errorf("tracemanager: bad save payload: %w", err)
	}
	if err := saveCategories(sections); err != nil {
		return nil, err
	}
	return nil, nil
}

func (m *Manager) handleOpenRegedit(_ context.Context, payload json.RawMessage) (any, error) {
	var req openRegeditRequest
	if len(payload) > 0 {
		if err := json.Unmarshal(payload, &req); err != nil {
			return nil, fmt.Errorf("tracemanager: bad openRegedit payload: %w", err)
		}
	}
	if req.Key == "" {
		req.Key = defaultRegeditKey
	}
	if err := openRegedit(req.Key); err != nil {
		return nil, err
	}
	return nil, nil
}

func (m *Manager) handleExportTrace(_ context.Context, _ json.RawMessage) (any, error) {
	return nil, exportTrace()
}

func (m *Manager) handleImportTrace(_ context.Context, _ json.RawMessage) (any, error) {
	return nil, importTrace()
}

func (m *Manager) handleStartStream(_ context.Context, _ json.RawMessage) (any, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.streaming {
		return nil, nil
	}
	if m.ctx == nil {
		return nil, fmt.Errorf("tracemanager: context not ready")
	}
	m.streaming = true
	m.stopCh = make(chan struct{})
	go m.streamLoop(m.ctx, m.stopCh)
	return nil, nil
}

func (m *Manager) handleStopStream(_ context.Context, _ json.RawMessage) (any, error) {
	m.mu.Lock()
	if !m.streaming {
		m.mu.Unlock()
		return nil, nil
	}
	m.streaming = false
	close(m.stopCh)
	m.stopCh = nil
	m.mu.Unlock()
	return nil, nil
}

// ---- streaming --------------------------------------------------------------

// streamLoop emits synthetic trace calls on a timer. The legacy app received
// real trace calls from DP processes via the tmtrace pipe; without that pipe
// we generate representative calls from a few fake processes so the per-PID
// trace windows can be demonstrated. Color prefixes follow the legacy
// TRACECOLOR_PREFIX/SUFIX scheme (see tracecolor.go on the frontend).
func (m *Manager) streamLoop(ctx context.Context, stop <-chan struct{}) {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	ticker := time.NewTicker(700 * time.Millisecond)
	defer ticker.Stop()

	type proc struct {
		pid  uint32
		name string
	}
	procs := []proc{
		{0x1A2B3C4D, "dpotssvc.exe"},
		{0x0E1F2A3B, "dpfpccim.exe"},
		{0x2C3D4E5F, "dphost.exe"},
	}

	functions := []string{"CApi::Verify", "Bio::Capture", "Pipe::Read", "Reg::Query", "Crypt::Decrypt"}
	texts := []string{"handle opened", "credential matched", "timeout waiting for sensor", "registry value cached", "session token refreshed"}

	for {
		select {
		case <-stop:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			p := procs[rng.Intn(len(procs))]
			color := rng.Intn(16)
			call := TraceCall{
				ProcessID:    p.pid,
				ProcessName:  p.name,
				ThreadID:     uint32(rng.Intn(9000) + 1000),
				Module:       0x10000000 + uint32(rng.Intn(0xFFFF)),
				FunctionName: functions[rng.Intn(len(functions))],
				Text:         formatTraceColor(color, texts[rng.Intn(len(texts))]),
				Timestamp:    time.Now().UnixMilli(),
			}
			runtime.EventsEmit(ctx, EventTraceCall, call)
		}
	}
}
