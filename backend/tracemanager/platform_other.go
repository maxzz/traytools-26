//go:build !windows

package tracemanager

import (
	"errors"
	"sync"
)

// Non-Windows fallback. There are no DigitalPersona DLLs or registry, so the
// categories come from the built-in tables and their active state is kept in
// memory for the lifetime of the process. This keeps the UI fully exercisable
// on any platform.

var (
	otherMu    sync.Mutex
	otherMasks = map[string]uint32{}
)

func platformLoadCategories() ([]SectionDescription, error) {
	otherMu.Lock()
	defer otherMu.Unlock()
	return builtinSectionsCopy(otherMasks), nil
}

func platformSaveCategories(sections []SectionDescription) error {
	otherMu.Lock()
	defer otherMu.Unlock()
	for _, s := range sections {
		otherMasks[s.SectionName] = maskFromSection(s)
	}
	return nil
}

func platformOpenRegedit(_ string) error {
	return errors.New("registry editor is only available on Windows")
}

func platformRunTrace(_ string) error {
	return errors.New("trace export/import is only available on Windows")
}

func platformStartCapture(_ func(TraceCall)) (func(), error) {
	// No shared-memory IPC on non-Windows.
	return nil, errors.New("live trace capture is only available on Windows")
}
