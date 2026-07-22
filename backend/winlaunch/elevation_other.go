//go:build !windows

package winlaunch

func IsElevated() bool {
	return false
}

func RelaunchElevated() error {
	return nil
}

func RelaunchUnelevated() error {
	return nil
}
