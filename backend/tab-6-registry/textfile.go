package registryops

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf16"
)

// Registry Editor writes .reg files as UTF-16LE with a BOM and CRLF line
// endings, so reading one with os.ReadFile and handing the bytes to the
// frontend as a string produces interleaved NULs. These helpers decode on read
// and re-encode on write so .reg round-trips byte-for-byte compatible with
// regedit, while .json keeps plain UTF-8.

var (
	bomUTF16LE = []byte{0xFF, 0xFE}
	bomUTF16BE = []byte{0xFE, 0xFF}
	bomUTF8    = []byte{0xEF, 0xBB, 0xBF}
)

// readTextFile reads a file and returns UTF-8 text, decoding UTF-16 when a BOM
// says so. Line endings are normalized to \n for the frontend.
func readTextFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return decodeText(data), nil
}

// writeTextFile writes text to path. A ".reg" target is encoded as UTF-16LE
// with a BOM and CRLF endings; anything else is written as plain UTF-8.
func writeTextFile(path, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	var data []byte
	if strings.EqualFold(filepath.Ext(path), ".reg") {
		data = encodeUTF16LE(toCRLF(content))
	} else {
		data = []byte(content)
	}
	return os.WriteFile(path, data, 0o644)
}

// decodeText converts file bytes to UTF-8 text based on the leading BOM, and
// normalizes CRLF to LF. Without a BOM the bytes are assumed to be UTF-8.
func decodeText(data []byte) string {
	switch {
	case bytes.HasPrefix(data, bomUTF16LE):
		return normalizeNewlines(decodeUTF16(data[2:], false))
	case bytes.HasPrefix(data, bomUTF16BE):
		return normalizeNewlines(decodeUTF16(data[2:], true))
	case bytes.HasPrefix(data, bomUTF8):
		return normalizeNewlines(string(data[3:]))
	}

	// No BOM: regedit always writes one for 5.00 files, but hand-made UTF-16
	// files exist. Interleaved NULs in otherwise ASCII text give it away.
	if looksLikeUTF16LE(data) {
		return normalizeNewlines(decodeUTF16(data, false))
	}
	return normalizeNewlines(string(data))
}

// looksLikeUTF16LE reports whether the head of data looks like ASCII characters
// stored as little-endian UTF-16 code units (every odd byte is zero).
func looksLikeUTF16LE(data []byte) bool {
	if len(data) < 4 || len(data)%2 != 0 {
		return false
	}
	limit := len(data)
	if limit > 64 {
		limit = 64
	}
	zeroHigh := 0
	pairs := 0
	for i := 0; i+1 < limit; i += 2 {
		pairs++
		if data[i+1] == 0x00 {
			zeroHigh++
		}
	}
	return pairs > 0 && zeroHigh == pairs
}

func decodeUTF16(data []byte, bigEndian bool) string {
	units := make([]uint16, 0, len(data)/2)
	for i := 0; i+1 < len(data); i += 2 {
		if bigEndian {
			units = append(units, uint16(data[i])<<8|uint16(data[i+1]))
		} else {
			units = append(units, uint16(data[i+1])<<8|uint16(data[i]))
		}
	}
	return string(utf16.Decode(units))
}

func encodeUTF16LE(s string) []byte {
	units := utf16.Encode([]rune(s))
	out := make([]byte, 0, len(units)*2+2)
	out = append(out, bomUTF16LE...)
	for _, u := range units {
		out = append(out, byte(u), byte(u>>8))
	}
	return out
}

func normalizeNewlines(s string) string {
	return strings.ReplaceAll(s, "\r\n", "\n")
}

func toCRLF(s string) string {
	return strings.ReplaceAll(normalizeNewlines(s), "\n", "\r\n")
}
