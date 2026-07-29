package toolsmenu

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestSplitFileArgs_Quoted(t *testing.T) {
	tests := []struct {
		in, wantTarget, wantArgs string
	}{
		{`"C:\Program Files\App\app.exe" --flag`, `C:\Program Files\App\app.exe`, `--flag`},
		{`"filename"args`, `filename`, `args`},
		{`"filename args`, `"filename`, `args`}, // unterminated → space fallback
		{`""`, ``, ``},
	}
	for _, tt := range tests {
		gotT, gotA := splitFileArgs(tt.in, "")
		if gotT != tt.wantTarget || gotA != tt.wantArgs {
			t.Errorf("splitFileArgs(%q) = (%q, %q), want (%q, %q)",
				tt.in, gotT, gotA, tt.wantTarget, tt.wantArgs)
		}
	}
}

func TestSplitFileArgs_PathWithSpaces(t *testing.T) {
	dir := t.TempDir()
	spaced := filepath.Join(dir, "org page-qa2-test")
	if err := os.MkdirAll(spaced, 0o755); err != nil {
		t.Fatal(err)
	}
	exe := filepath.Join(spaced, "notepad.exe")
	if err := os.WriteFile(exe, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	gotT, gotA := splitFileArgs(exe, "")
	if gotT != exe || gotA != "" {
		t.Fatalf("existing path with spaces: got (%q, %q), want (%q, \"\")", gotT, gotA, exe)
	}

	withArgs := exe + " --flag"
	gotT, gotA = splitFileArgs(withArgs, "")
	if gotT != exe || gotA != "--flag" {
		t.Fatalf("path with spaces + args: got (%q, %q), want (%q, --flag)", gotT, gotA, exe)
	}
}

func TestSplitFileArgs_MissingPathWithSpacesKeptWhole(t *testing.T) {
	// File picker paths must not be truncated at the first space when the
	// target is not (yet) on disk.
	missing := `C:\Users\maxzz\Desktop\org page-qa2-test\notepad.exe`
	if runtime.GOOS != "windows" {
		missing = `/home/user/org page-qa2-test/notepad`
	}
	gotT, gotA := splitFileArgs(missing, "")
	if gotT != missing || gotA != "" {
		t.Fatalf("missing path with spaces: got (%q, %q), want (%q, \"\")", gotT, gotA, missing)
	}
}

func TestSplitFileArgs_RelativeWithSpaces(t *testing.T) {
	base := t.TempDir()
	spaced := filepath.Join(base, "my tools")
	if err := os.MkdirAll(spaced, 0o755); err != nil {
		t.Fatal(err)
	}
	exeName := "app.exe"
	if err := os.WriteFile(filepath.Join(spaced, exeName), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	rel := filepath.Join("my tools", exeName)
	gotT, gotA := splitFileArgs(rel+" -x", base)
	if gotT != rel || gotA != "-x" {
		t.Fatalf("relative path with spaces: got (%q, %q), want (%q, -x)", gotT, gotA, rel)
	}
}

func TestSplitFileArgs_BareNameFirstSpace(t *testing.T) {
	gotT, gotA := splitFileArgs("notepad.exe file.txt", "")
	if gotT != "notepad.exe" || gotA != "file.txt" {
		t.Fatalf("bare name: got (%q, %q), want (notepad.exe, file.txt)", gotT, gotA)
	}
}

func TestResolveCommand_AbsPathWithSpaces(t *testing.T) {
	dir := t.TempDir()
	spaced := filepath.Join(dir, "org page-qa2-test")
	if err := os.MkdirAll(spaced, 0o755); err != nil {
		t.Fatal(err)
	}
	exe := filepath.Join(spaced, "notepad.exe")
	if err := os.WriteFile(exe, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	cmd := resolveCommand(dir, MenuNode{
		CmdLine: exe,
		CmdWhat: whatAbs,
	})
	if cmd.path != toBackslashes(exe) {
		t.Fatalf("resolved path = %q, want %q", cmd.path, toBackslashes(exe))
	}
	if cmd.args != "" {
		t.Fatalf("resolved args = %q, want empty", cmd.args)
	}
}
