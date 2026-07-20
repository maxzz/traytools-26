package dpagent

import (
	"fmt"
	"time"
)

// DefaultEnsureStoppedTimeout is how long EnsureStopped waits for DPAgent to
// disappear after a stop request. Used by copy operations that must not race
// with a still-running agent.
const DefaultEnsureStoppedTimeout = 5 * time.Second

// EnsureStopped makes sure DPAgent is not running. If it is already stopped,
// it returns immediately. Otherwise it issues platformStop and polls status
// until the agent window is gone or timeout elapses.
//
// This helper lives in its own file so copy-operation callers (and the
// "ensureStopped" bus command) stay clearly separated from ordinary toolbar stop.
func EnsureStopped(timeout time.Duration) error {
	if timeout <= 0 {
		timeout = DefaultEnsureStoppedTimeout
	}

	st, err := platformGetStatus()
	if err != nil {
		return fmt.Errorf("dpagent: status before stop: %w", err)
	}
	if !st.Running {
		return nil
	}

	if err := platformStop(); err != nil {
		return fmt.Errorf("dpagent: stop: %w", err)
	}

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		st, err = platformGetStatus()
		if err != nil {
			return fmt.Errorf("dpagent: status after stop: %w", err)
		}
		if !st.Running {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}

	return fmt.Errorf("dpagent: still running after %s", timeout)
}
