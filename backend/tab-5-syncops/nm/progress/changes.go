package progress

// Update markers describe actions required to sync destination with source.
const (
	MarkerAdd    rune = 'A'
	MarkerModify rune = 'M'
	MarkerDelete rune = 'D'
)

// ChangeEntry describes one file that needs updating during copy or sync.
type ChangeEntry struct {
	Marker  rune
	RelPath string
}
