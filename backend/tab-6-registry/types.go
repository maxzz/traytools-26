// Package registryops implements the Registry editor: disk-backed registry.json,
// native file dialogs (JSON and Windows .reg), and batched reads/writes of real
// registry values.
//
// Unlike copyops, batches return their results synchronously rather than through
// EventsEmit: registry access is effectively instant, so per-item progress events
// would add machinery without adding information.
package registryops

// Group is the bus group name shared with the frontend bridge.
const Group = "registryops"

// Registry value types supported by the editor. These mirror the REG_* names so
// they can be written into .reg files and shown in the UI unchanged.
const (
	TypeSZ       = "REG_SZ"
	TypeExpandSZ = "REG_EXPAND_SZ"
	TypeDWord    = "REG_DWORD"
	TypeQWord    = "REG_QWORD"
	TypeBinary   = "REG_BINARY"
	TypeMultiSZ  = "REG_MULTI_SZ"
)

// RawResponse is returned by the "getRaw" command.
type RawResponse struct {
	Found   bool   `json:"found"`
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
	Error   string `json:"error,omitempty"`
}

// SaveResponse is returned by "save" and "writeTextFile".
type SaveResponse struct {
	Path string `json:"path"`
}

// PickResponse is returned by the importPath / exportPath dialogs.
type PickResponse struct {
	Canceled bool   `json:"canceled"`
	Path     string `json:"path,omitempty"`
}

// ValueSpec identifies one registry value, and (for writes) the value to store.
//
// Value always travels as text in the canonical form used by the editor:
//
//	REG_SZ / REG_EXPAND_SZ  literal text
//	REG_DWORD / REG_QWORD   decimal, or hex with a "0x" prefix
//	REG_BINARY              comma- or space-separated hex byte pairs
//	REG_MULTI_SZ            one string per line
type ValueSpec struct {
	Hive      string `json:"hive"`      // HKCU | HKLM | HKCR | HKU | HKCC (long names also accepted)
	KeyPath   string `json:"keyPath"`   // SOFTWARE\DigitalPersona\Tracing
	ValueName string `json:"valueName"` // "" means the key's (Default) value
	ValueType string `json:"valueType"` // REG_*
	Value     string `json:"value,omitempty"`
	View      string `json:"view,omitempty"` // "" | curr | 32 | 64
}

// ReadResult is one entry of the "readBatch" response. Exists is false when
// either the key or the value is missing; ValueType is the actual REG_* type
// found, which may differ from the one requested.
type ReadResult struct {
	Index     int    `json:"index"`
	Exists    bool   `json:"exists"`
	ValueType string `json:"valueType,omitempty"`
	Value     string `json:"value,omitempty"`
	Error     string `json:"error,omitempty"`
}

// WriteResult is one entry of the "writeBatch" response. AccessDenied lets the
// frontend offer an elevation restart.
type WriteResult struct {
	Index         int    `json:"index"`
	Status        string `json:"status"` // written | unchanged | failed
	PreviousValue string `json:"previousValue,omitempty"`
	Error         string `json:"error,omitempty"`
	AccessDenied  bool   `json:"accessDenied,omitempty"`
}

// Write status values reported in WriteResult.
const (
	StatusWritten   = "written"
	StatusUnchanged = "unchanged"
	StatusFailed    = "failed"
)

// BatchRequest is the payload for "readBatch" and "writeBatch".
type BatchRequest struct {
	Items []ValueSpec `json:"items"`
}

// ReadBatchResponse is returned by "readBatch".
type ReadBatchResponse struct {
	Results []ReadResult `json:"results"`
}

// WriteBatchResponse is returned by "writeBatch".
type WriteBatchResponse struct {
	Results []WriteResult `json:"results"`
}
