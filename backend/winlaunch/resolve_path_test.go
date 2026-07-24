package winlaunch

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestExpandEnvVars(t *testing.T) {
	t.Setenv("TT_TEST_VAR", `C:\Temp\TrayTools`)
	got := expandEnvVars(`%TT_TEST_VAR%\file.txt`)
	want := `C:\Temp\TrayTools\file.txt`
	if got != want {
		t.Fatalf("expandEnvVars: got %q want %q", got, want)
	}
	unknown := expandEnvVars(`%TT_MISSING_VAR%\x`)
	if unknown != `%TT_MISSING_VAR%\x` {
		t.Fatalf("unknown var should stay literal, got %q", unknown)
	}
}

func TestResolveExistingPath_EnvAndBareName(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows-focused path resolution")
	}

	appData := os.Getenv("APPDATA")
	if appData == "" {
		t.Fatal("APPDATA not set")
	}
	got, err := resolveExistingPath(`%APPDATA%`)
	if err != nil {
		t.Fatalf("resolve %%APPDATA%%: %v", err)
	}
	if !strings.EqualFold(filepath.Clean(got), filepath.Clean(appData)) {
		t.Fatalf("resolve %%APPDATA%%: got %q want %q", got, appData)
	}

	got, err = resolveExistingPath("notepad.exe")
	if err != nil {
		t.Fatalf("resolve notepad.exe: %v", err)
	}
	if !strings.EqualFold(filepath.Base(got), "notepad.exe") {
		t.Fatalf("resolve notepad.exe: unexpected path %q", got)
	}
	if _, err := os.Stat(got); err != nil {
		t.Fatalf("resolved notepad.exe does not exist: %v", err)
	}
}

func TestResolveExistingPath_RejectURL(t *testing.T) {
	_, err := resolveExistingPath("https://example.com")
	if err == nil {
		t.Fatal("expected error for URL")
	}
}
