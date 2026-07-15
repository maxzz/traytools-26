//go:build !windows

package dpagent

import "fmt"

func platformGetStatus() (Status, error) {
	return Status{
		Running:        false,
		AgentIntegrity: IntegrityNA,
		SelfIntegrity:  IntegrityNA,
	}, nil
}

func platformStart(asHigh bool) error {
	return fmt.Errorf("DPAgent control is only supported on Windows")
}

func platformStop() error {
	return fmt.Errorf("DPAgent control is only supported on Windows")
}
