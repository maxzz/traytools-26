package registryops

import (
	"fmt"
	"strconv"
	"strings"
)

// Registry values travel between Go and the frontend as text so registry.json
// stays readable and round-trips through .reg files unchanged. This file owns
// that canonical text form; the platform layer only deals with typed values.

// parseUint parses a REG_DWORD / REG_QWORD value written in decimal, or in hex
// with a "0x" prefix. bits is 32 or 64.
func parseUint(text string, bits int) (uint64, error) {
	s := strings.TrimSpace(text)
	if s == "" {
		return 0, nil
	}
	base := 10
	if lower := strings.ToLower(s); strings.HasPrefix(lower, "0x") {
		s = s[2:]
		base = 16
	}
	v, err := strconv.ParseUint(s, base, bits)
	if err != nil {
		return 0, fmt.Errorf("invalid %d-bit number %q", bits, text)
	}
	return v, nil
}

// parseBinary parses REG_BINARY text: hex byte pairs separated by commas,
// spaces, or nothing at all ("de,ad,be,ef" / "de ad be ef" / "deadbeef").
func parseBinary(text string) ([]byte, error) {
	cleaned := strings.Map(
		func(r rune) rune {
			switch r {
			case ',', ' ', '\t', '\r', '\n', '-', ':':
				return -1
			}
			return r
		},
		text,
	)
	if cleaned == "" {
		return nil, nil
	}
	if len(cleaned)%2 != 0 {
		return nil, fmt.Errorf("binary value must have an even number of hex digits")
	}
	out := make([]byte, 0, len(cleaned)/2)
	for i := 0; i < len(cleaned); i += 2 {
		b, err := strconv.ParseUint(cleaned[i:i+2], 16, 8)
		if err != nil {
			return nil, fmt.Errorf("invalid hex byte %q", cleaned[i:i+2])
		}
		out = append(out, byte(b))
	}
	return out, nil
}

// formatBinary renders bytes as the comma-separated lowercase hex used by .reg.
func formatBinary(data []byte) string {
	if len(data) == 0 {
		return ""
	}
	parts := make([]string, len(data))
	for i, b := range data {
		parts[i] = fmt.Sprintf("%02x", b)
	}
	return strings.Join(parts, ",")
}

// parseMultiSZ splits REG_MULTI_SZ text into its strings, one per line. A
// trailing empty line is dropped so "a\nb\n" and "a\nb" mean the same thing.
func parseMultiSZ(text string) []string {
	if text == "" {
		return nil
	}
	parts := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")
	for len(parts) > 0 && parts[len(parts)-1] == "" {
		parts = parts[:len(parts)-1]
	}
	return parts
}

func formatMultiSZ(values []string) string {
	return strings.Join(values, "\n")
}

// normalizeValueType maps user input onto a supported REG_* constant, accepting
// the short forms used in .reg files and the UI.
func normalizeValueType(t string) string {
	switch strings.ToUpper(strings.TrimSpace(t)) {
	case "", TypeSZ, "SZ", "STRING":
		return TypeSZ
	case TypeExpandSZ, "EXPAND_SZ", "EXPANDSZ":
		return TypeExpandSZ
	case TypeDWord, "DWORD":
		return TypeDWord
	case TypeQWord, "QWORD":
		return TypeQWord
	case TypeBinary, "BINARY":
		return TypeBinary
	case TypeMultiSZ, "MULTI_SZ", "MULTISZ":
		return TypeMultiSZ
	}
	return TypeSZ
}
