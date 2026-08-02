package registryops

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDecodeTextUTF16LEWithBOM(t *testing.T) {
	// "AB\r\nC" as UTF-16LE with a BOM, the shape regedit writes.
	data := append([]byte{0xFF, 0xFE}, 'A', 0, 'B', 0, '\r', 0, '\n', 0, 'C', 0)

	if got, want := decodeText(data), "AB\nC"; got != want {
		t.Fatalf("decodeText = %q, want %q", got, want)
	}
}

func TestDecodeTextUTF16LEWithoutBOM(t *testing.T) {
	data := []byte{'A', 0, 'B', 0}

	if got, want := decodeText(data), "AB"; got != want {
		t.Fatalf("decodeText = %q, want %q", got, want)
	}
}

func TestDecodeTextUTF8(t *testing.T) {
	cases := map[string][]byte{
		"plain":    []byte("hello\r\nworld"),
		"with BOM": append([]byte{0xEF, 0xBB, 0xBF}, []byte("hello\r\nworld")...),
	}

	for name, data := range cases {
		if got, want := decodeText(data), "hello\nworld"; got != want {
			t.Fatalf("%s: decodeText = %q, want %q", name, got, want)
		}
	}
}

// A .reg file must land on disk as UTF-16LE + BOM + CRLF or regedit rejects it.
func TestWriteTextFileRegIsUTF16LE(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sample.reg")
	content := "Windows Registry Editor Version 5.00\n\n[HKEY_CURRENT_USER\\Foo]\n"

	if err := writeTextFile(path, content); err != nil {
		t.Fatalf("writeTextFile: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if !bytes.HasPrefix(raw, []byte{0xFF, 0xFE}) {
		t.Fatalf("missing UTF-16LE BOM, got % x", raw[:min(4, len(raw))])
	}
	if !bytes.Contains(raw, []byte{'\r', 0, '\n', 0}) {
		t.Fatal("expected CRLF encoded as UTF-16 code units")
	}

	// Reading it back must reproduce the original text with LF endings.
	round, err := readTextFile(path)
	if err != nil {
		t.Fatalf("readTextFile: %v", err)
	}
	if round != content {
		t.Fatalf("round-trip = %q, want %q", round, content)
	}
}

func TestWriteTextFileJSONStaysUTF8(t *testing.T) {
	path := filepath.Join(t.TempDir(), "registry.json")
	content := "{\n    \"groups\": []\n}\n"

	if err := writeTextFile(path, content); err != nil {
		t.Fatalf("writeTextFile: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	if string(raw) != content {
		t.Fatalf("JSON was re-encoded: got %q, want %q", raw, content)
	}
}

func TestParseUint(t *testing.T) {
	cases := []struct {
		text string
		bits int
		want uint64
	}{
		{"42", 32, 42},
		{"0x2a", 32, 42},
		{"0X2A", 32, 42},
		{"", 32, 0},
		{" 7 ", 32, 7},
		{"18446744073709551615", 64, 1<<64 - 1},
	}

	for _, c := range cases {
		got, err := parseUint(c.text, c.bits)
		if err != nil {
			t.Fatalf("parseUint(%q, %d): %v", c.text, c.bits, err)
		}
		if got != c.want {
			t.Fatalf("parseUint(%q, %d) = %d, want %d", c.text, c.bits, got, c.want)
		}
	}

	if _, err := parseUint("4294967296", 32); err == nil {
		t.Fatal("expected overflow error for a value beyond 32 bits")
	}
	if _, err := parseUint("nope", 32); err == nil {
		t.Fatal("expected error for non-numeric text")
	}
}

func TestParseAndFormatBinary(t *testing.T) {
	for _, text := range []string{"de,ad,be,ef", "de ad be ef", "deadbeef", "DE:AD-BE:EF"} {
		data, err := parseBinary(text)
		if err != nil {
			t.Fatalf("parseBinary(%q): %v", text, err)
		}
		if got := formatBinary(data); got != "de,ad,be,ef" {
			t.Fatalf("parseBinary(%q) → %q, want de,ad,be,ef", text, got)
		}
	}

	if _, err := parseBinary("abc"); err == nil {
		t.Fatal("expected an error for an odd number of hex digits")
	}
}

func TestParseMultiSZDropsTrailingBlankLines(t *testing.T) {
	got := parseMultiSZ("a\r\nb\n\n")
	if strings.Join(got, "|") != "a|b" {
		t.Fatalf("parseMultiSZ = %v, want [a b]", got)
	}
	if parseMultiSZ("") != nil {
		t.Fatal("empty text should produce no strings")
	}
}

func TestNormalizeValueType(t *testing.T) {
	cases := map[string]string{
		"":             TypeSZ,
		"string":       TypeSZ,
		"dword":        TypeDWord,
		"REG_QWORD":    TypeQWord,
		"multi_sz":     TypeMultiSZ,
		"EXPANDSZ":     TypeExpandSZ,
		"binary":       TypeBinary,
		"nonsense":     TypeSZ,
		" REG_DWORD  ": TypeDWord,
	}

	for in, want := range cases {
		if got := normalizeValueType(in); got != want {
			t.Fatalf("normalizeValueType(%q) = %q, want %q", in, got, want)
		}
	}
}
