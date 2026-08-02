//go:build !windows

package registryops

// The Registry tab is Windows-only. These stubs keep non-Windows builds
// compiling (the repo has a darwin build script) and report the limitation
// instead of silently doing nothing.

const errUnsupported = "the Registry tab is only available on Windows"

func readValue(spec ValueSpec) ReadResult {
	return ReadResult{Error: errUnsupported}
}

func writeValue(spec ValueSpec) WriteResult {
	return WriteResult{Status: StatusFailed, Error: errUnsupported}
}

func jumpToKey(keyPath string) error {
	return errNotSupported{}
}

type errNotSupported struct{}

func (errNotSupported) Error() string { return errUnsupported }
