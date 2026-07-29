package copyops

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExtractURLFromInternetShortcut(t *testing.T) {
	tests := []struct {
		name    string
		content string
		want    string
		wantErr bool
	}{
		{
			name: "standard",
			content: "[InternetShortcut]\r\n" +
				"URL=https://example.com/path\r\n" +
				"IconIndex=0\r\n",
			want: "https://example.com/path",
		},
		{
			name:    "no section",
			content: "URL=https://learn.microsoft.com/sysinternals/\n",
			want:    "https://learn.microsoft.com/sysinternals/",
		},
		{
			name:    "empty",
			content: "[InternetShortcut]\nIconFile=x.ico\n",
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractURLFromInternetShortcut(tt.content)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseInternetShortcutFile_UTF16(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "link.url")
	// UTF-16 LE BOM + "URL=https://example.com\n"
	payload := []byte{
		0xFF, 0xFE,
		'U', 0, 'R', 0, 'L', 0, '=', 0,
		'h', 0, 't', 0, 't', 0, 'p', 0, 's', 0, ':', 0, '/', 0, '/', 0,
		'e', 0, 'x', 0, 'a', 0, 'm', 0, 'p', 0, 'l', 0, 'e', 0, '.', 0,
		'c', 0, 'o', 0, 'm', 0, '\n', 0,
	}
	if err := os.WriteFile(path, payload, 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := parseInternetShortcutFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if got != "https://example.com" {
		t.Fatalf("got %q", got)
	}
}

func TestNormalizeDroppedPath_ResolveURLFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "ms.url")
	body := "[InternetShortcut]\nURL=https://learn.microsoft.com/\n"
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := normalizeDroppedPath(path, "file", true)
	if err != nil {
		t.Fatal(err)
	}
	if got != "https://learn.microsoft.com/" {
		t.Fatalf("resolve on: got %q", got)
	}

	got, err = normalizeDroppedPath(path, "file", false)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.EqualFold(filepath.Ext(got), ".url") {
		t.Fatalf("resolve off: got %q, want a .url path", got)
	}
}
