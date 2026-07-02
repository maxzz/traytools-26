//go:build !windows

package tracemanager

import "fmt"

const defaultRegeditKey = `HKLM\SOFTWARE\DigitalPersona\Tracing`

// loadCategories on non-Windows returns a small representative sample so the
// UI is exercisable outside Windows. The real implementation lives in
// registry_windows.go.
func loadCategories() ([]SectionDescription, error) {
	return sampleCategories(), nil
}

func saveCategories(_ []SectionDescription) error {
	return fmt.Errorf("tracemanager: registry save is only supported on Windows")
}

func openRegedit(_ string) error {
	return fmt.Errorf("tracemanager: regedit is only available on Windows")
}

func exportTrace() error {
	return fmt.Errorf("tracemanager: dpocache.dll export is only available on Windows")
}

func importTrace() error {
	return fmt.Errorf("tracemanager: dpocache.dll import is only available on Windows")
}

// sampleCategories provides a few sections with a couple of active categories
// each, purely for non-Windows demonstration.
func sampleCategories() []SectionDescription {
	mk := func(name string, activeBits ...int) SectionDescription {
		descs := make([]StringDescription, 8)
		for i := range descs {
			descs[i] = StringDescription{
				MemID:       i,
				Description: fmt.Sprintf("Category %d", i),
			}
		}
		for _, b := range activeBits {
			if b >= 0 && b < len(descs) {
				descs[b].Active = true
			}
		}
		return SectionDescription{SectionName: name, StringDescriptions: descs}
	}
	return []SectionDescription{
		mk("ots_traytools", 0, 3),
		mk("ots_dpotssvc", 1, 2, 5),
		mk("ots_dpfpccim", 4),
	}
}
