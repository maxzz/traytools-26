//go:build windows

package registryops

import (
	"errors"
	"fmt"
	"strings"

	"traytools-26-go/backend/winregedit"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// Hive names accepted from the frontend, in both short and long form. The
// table mirrors backend/winregedit so a key path written for one works in the
// other.
var hives = map[string]registry.Key{
	"HKLM":                registry.LOCAL_MACHINE,
	"HKEY_LOCAL_MACHINE":  registry.LOCAL_MACHINE,
	"HKCU":                registry.CURRENT_USER,
	"HKEY_CURRENT_USER":   registry.CURRENT_USER,
	"HKCR":                registry.CLASSES_ROOT,
	"HKEY_CLASSES_ROOT":   registry.CLASSES_ROOT,
	"HKCC":                registry.CURRENT_CONFIG,
	"HKEY_CURRENT_CONFIG": registry.CURRENT_CONFIG,
	"HKU":                 registry.USERS,
	"HKEY_USERS":          registry.USERS,
}

func resolveHive(name string) (registry.Key, error) {
	if k, ok := hives[strings.ToUpper(strings.TrimSpace(name))]; ok {
		return k, nil
	}
	return 0, fmt.Errorf("unknown registry root %q", name)
}

// viewFlag maps the editor's registry view onto the WOW64 access flags. An
// empty or "curr" view uses the process's native view.
func viewFlag(view string) uint32 {
	switch strings.TrimSpace(view) {
	case "32":
		return registry.WOW64_32KEY
	case "64":
		return registry.WOW64_64KEY
	}
	return 0
}

// normalizeSubkey strips a leading backslash and converts forward slashes, so
// paths pasted from regedit or from a .reg file both work.
func normalizeSubkey(path string) string {
	p := strings.TrimSpace(path)
	p = strings.ReplaceAll(p, "/", `\`)
	return strings.Trim(p, `\`)
}

// readValue reads a single value. A missing key or value is reported as
// Exists=false rather than as an error, since that is a normal state for an
// item the user has not applied yet.
func readValue(spec ValueSpec) ReadResult {
	root, err := resolveHive(spec.Hive)
	if err != nil {
		return ReadResult{Error: err.Error()}
	}

	key, err := registry.OpenKey(root, normalizeSubkey(spec.KeyPath), registry.QUERY_VALUE|viewFlag(spec.View))
	if err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return ReadResult{Exists: false}
		}
		return ReadResult{Error: err.Error()}
	}
	defer key.Close()

	_, valType, err := key.GetValue(spec.ValueName, nil)
	if err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return ReadResult{Exists: false}
		}
		return ReadResult{Error: err.Error()}
	}

	text, typeName, err := readTypedValue(key, spec.ValueName, valType)
	if err != nil {
		return ReadResult{Error: err.Error()}
	}
	return ReadResult{Exists: true, ValueType: typeName, Value: text}
}

// readTypedValue reads the value using the getter matching its actual on-disk
// type and renders it in the editor's canonical text form.
func readTypedValue(key registry.Key, name string, valType uint32) (text string, typeName string, err error) {
	switch valType {
	case registry.SZ:
		s, _, err := key.GetStringValue(name)
		return s, TypeSZ, err

	case registry.EXPAND_SZ:
		// Deliberately not expanded: the editor shows and writes the raw
		// template (e.g. %SystemRoot%\...), not its resolved value.
		s, _, err := key.GetStringValue(name)
		return s, TypeExpandSZ, err

	case registry.MULTI_SZ:
		v, _, err := key.GetStringsValue(name)
		return formatMultiSZ(v), TypeMultiSZ, err

	case registry.DWORD:
		v, _, err := key.GetIntegerValue(name)
		return fmt.Sprintf("%d", uint32(v)), TypeDWord, err

	case registry.QWORD:
		v, _, err := key.GetIntegerValue(name)
		return fmt.Sprintf("%d", v), TypeQWord, err

	case registry.BINARY:
		v, _, err := key.GetBinaryValue(name)
		return formatBinary(v), TypeBinary, err
	}

	// Unsupported type (REG_NONE, REG_LINK, resource lists): surface the raw
	// bytes as binary so the user at least sees what is there.
	raw, _, err := key.GetBinaryValue(name)
	if err != nil {
		return "", TypeBinary, fmt.Errorf("unsupported registry value type %d", valType)
	}
	return formatBinary(raw), TypeBinary, nil
}

// writeValue creates the key if needed and stores the value. It reports
// "unchanged" when the existing value already matches, so re-running a group is
// cheap and the report stays informative.
func writeValue(spec ValueSpec) WriteResult {
	root, err := resolveHive(spec.Hive)
	if err != nil {
		return WriteResult{Status: StatusFailed, Error: err.Error()}
	}

	// An empty sub-key resolves to the hive root itself, so a half-filled item
	// would silently drop a value at e.g. HKCU\. Refuse instead.
	if normalizeSubkey(spec.KeyPath) == "" {
		return WriteResult{Status: StatusFailed, Error: "key path is empty"}
	}

	valType := normalizeValueType(spec.ValueType)

	before := readValue(spec)
	if before.Exists && before.ValueType == valType && before.Value == spec.Value {
		return WriteResult{Status: StatusUnchanged, PreviousValue: before.Value}
	}

	key, _, err := registry.CreateKey(root, normalizeSubkey(spec.KeyPath), registry.SET_VALUE|viewFlag(spec.View))
	if err != nil {
		return WriteResult{Status: StatusFailed, Error: err.Error(), AccessDenied: isAccessDenied(err)}
	}
	defer key.Close()

	if err := setTypedValue(key, spec.ValueName, valType, spec.Value); err != nil {
		return WriteResult{Status: StatusFailed, Error: err.Error(), AccessDenied: isAccessDenied(err)}
	}

	return WriteResult{Status: StatusWritten, PreviousValue: before.Value}
}

func setTypedValue(key registry.Key, name, valType, text string) error {
	switch valType {
	case TypeSZ:
		return key.SetStringValue(name, text)

	case TypeExpandSZ:
		return key.SetExpandStringValue(name, text)

	case TypeMultiSZ:
		return key.SetStringsValue(name, parseMultiSZ(text))

	case TypeDWord:
		v, err := parseUint(text, 32)
		if err != nil {
			return err
		}
		return key.SetDWordValue(name, uint32(v))

	case TypeQWord:
		v, err := parseUint(text, 64)
		if err != nil {
			return err
		}
		return key.SetQWordValue(name, v)

	case TypeBinary:
		data, err := parseBinary(text)
		if err != nil {
			return err
		}
		return key.SetBinaryValue(name, data)
	}
	return fmt.Errorf("unsupported registry value type %q", valType)
}

func isAccessDenied(err error) bool {
	return errors.Is(err, windows.ERROR_ACCESS_DENIED) || errors.Is(err, windows.ERROR_PRIVILEGE_NOT_HELD)
}

// jumpToKey opens regedit at the given "HIVE\subkey" path.
func jumpToKey(keyPath string) error {
	return winregedit.Jump(keyPath)
}
