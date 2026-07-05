package tracemanager

import (
	"fmt"
	"math/rand"
	"time"
)

// runDemo synthesizes trace calls from a handful of fake processes so the trace
// windows and color highlighting are demonstrable without a live producer. It
// stops when the stop channel is closed. This stands in for the "feeding
// thread" that the original C++ left as a TODO.
func (m *Manager) runDemo(stop <-chan struct{}) {
	type fakeProc struct {
		pid    uint32
		name   string
		module uint32
	}

	procs := []fakeProc{
		{4231, "dpofeedb host", 0x00400000},
		{7180, "dpocache.exe", 0x10000000},
		{9024, "explorer.exe", 0x00920000},
	}

	functions := []string{
		"OnHookMessage", "CacheLookup", "WindowPosChanged",
		"NotifyAll", "InstallHook", "OnActivate", "RefreshList",
	}

	// A few sample lines, some with color markers (see atl_trace.h WCOLOR_*).
	samples := []struct {
		color int // -1 = none
		text  string
	}{
		{-1, "entered"},
		{2, "cache hit, key=0x%04X"},
		{12, "CRITICAL: hook re-installed"},
		{13, "broadcast message received"},
		{9, "window pos changed to (%d,%d)"},
		{14, "skipped process, no access"},
		{-1, "leaving, rv=%d"},
	}

	ticker := time.NewTicker(350 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			p := procs[rand.Intn(len(procs))]
			fn := functions[rand.Intn(len(functions))]
			s := samples[rand.Intn(len(samples))]

			text := s.text
			switch s.text {
			case "cache hit, key=0x%04X":
				text = fmt.Sprintf(s.text, rand.Intn(0xffff))
			case "window pos changed to (%d,%d)":
				text = fmt.Sprintf(s.text, rand.Intn(1920), rand.Intn(1080))
			case "leaving, rv=%d":
				text = fmt.Sprintf(s.text, rand.Intn(2))
			}

			m.emit(TraceCall{
				ProcessID:  p.pid,
				ThreadID:   uint32(1000 + rand.Intn(8)),
				Module:     p.module,
				Function:   fn,
				Text:       text,
				ColorIndex: s.color,
			})
		}
	}
}
