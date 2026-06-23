package backend

import "log"

// EnsureElevatedIfRequested relaunches the current executable with UAC elevation
// when RunElevated is enabled in init.json and the process is not already elevated.
// It returns true when the caller should exit because a new elevated instance was started.
func EnsureElevatedIfRequested() bool {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil || !opts.RunElevated {
		return false
	}

	if IsElevated() {
		return false
	}

	if err := RelaunchElevated(); err != nil {
		log.Printf("failed to relaunch elevated: %v", err)
		return false
	}

	return true
}

func GetRunElevatedOption() bool {
	opts, err := LoadIniFileOptions()
	if err != nil || opts == nil {
		return false
	}
	return opts.RunElevated
}

func SetRunElevatedOption(value bool) error {
	opts, err := LoadIniFileOptions()
	if err != nil {
		opts = &IniOptions{}
	}
	opts.RunElevated = value
	return saveIniFileOptions(opts)
}
