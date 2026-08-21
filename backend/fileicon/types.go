// Package fileicon extracts icons from Windows executables, DLLs, and .ico
// files and converts them to PNG (with transparency) for the UI.
package fileicon

// Bus group shared with the frontend bridge (groups/fileicon.ts).
const Group = "fileicon"

// Result is one path's extracted icon, returned to the frontend as JSON.
type Result struct {
	Path    string `json:"path"`
	DataURL string `json:"dataUrl"` // empty when extraction failed
	Error   string `json:"error,omitempty"`
}
