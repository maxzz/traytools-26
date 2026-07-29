package copyops

import (
	"encoding/binary"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf16"
)

// resolveIfURLFile reads a Windows Internet Shortcut (.url) and returns the
// URL= target when resolve is true. Otherwise the path is returned unchanged.
func resolveIfURLFile(path string, resolve bool) (string, error) {
	if !resolve || !strings.EqualFold(filepath.Ext(path), ".url") {
		return path, nil
	}
	url, err := parseInternetShortcutFile(path)
	if err != nil {
		return "", fmt.Errorf("resolve url shortcut %q: %w", path, err)
	}
	return url, nil
}

func parseInternetShortcutFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return extractURLFromInternetShortcut(decodeURLFileBytes(data))
}

// decodeURLFileBytes handles UTF-8, UTF-8 BOM, and UTF-16 LE (common for .url).
func decodeURLFileBytes(data []byte) string {
	if len(data) >= 2 && data[0] == 0xFF && data[1] == 0xFE {
		return utf16LEBytesToString(data[2:])
	}
	if len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
		return string(data[3:])
	}
	// UTF-16 LE without BOM: many NULs in even positions of ASCII content.
	if looksLikeUTF16LE(data) {
		return utf16LEBytesToString(data)
	}
	return string(data)
}

func looksLikeUTF16LE(data []byte) bool {
	if len(data) < 4 || len(data)%2 != 0 {
		return false
	}
	nulEven := 0
	pairs := len(data) / 2
	limit := pairs
	if limit > 64 {
		limit = 64
	}
	for i := 0; i < limit; i++ {
		if data[i*2+1] == 0 {
			nulEven++
		}
	}
	return nulEven*2 >= limit
}

func utf16LEBytesToString(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	if len(b)%2 != 0 {
		b = b[:len(b)-1]
	}
	u16s := make([]uint16, len(b)/2)
	for i := range u16s {
		u16s[i] = binary.LittleEndian.Uint16(b[i*2:])
	}
	return string(utf16.Decode(u16s))
}

// extractURLFromInternetShortcut finds the URL= value in a .url INI body.
func extractURLFromInternetShortcut(content string) (string, error) {
	inSection := false
	sawSection := false
	var fallback string

	for _, raw := range strings.Split(content, "\n") {
		line := strings.TrimSpace(strings.TrimSuffix(raw, "\r"))
		if line == "" || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			inSection = strings.EqualFold(line, "[InternetShortcut]")
			if inSection {
				sawSection = true
			}
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok || !strings.EqualFold(strings.TrimSpace(key), "URL") {
			continue
		}
		u := strings.TrimSpace(val)
		if u == "" {
			continue
		}
		if inSection || !sawSection {
			return u, nil
		}
		if fallback == "" {
			fallback = u
		}
	}
	if fallback != "" {
		return fallback, nil
	}
	return "", fmt.Errorf("no URL= entry found")
}
