package skippat

import "testing"

func TestResolve(t *testing.T) {
	if got := Resolve(nil); len(got) != 2 || got[0] != `^\.git$` || got[1] != `^node_modules$` {
		t.Fatalf("nil → defaults, got %#v", got)
	}
	empty := Resolve([]string{})
	if empty == nil || len(empty) != 0 {
		t.Fatalf("empty slice should skip nothing, got %#v", empty)
	}
	custom := []string{`\.log$`}
	if got := Resolve(custom); len(got) != 1 || got[0] != `\.log$` {
		t.Fatalf("custom, got %#v", got)
	}
}

func TestMatchDefaults(t *testing.T) {
	m, err := Compile(DefaultPatterns)
	if err != nil {
		t.Fatal(err)
	}

	mustSkip := []struct {
		rel, name string
		dir       bool
	}{
		{`.git`, `.git`, true},
		{`vendor/.git`, `.git`, true},
		{`node_modules`, `node_modules`, true},
		{`app/node_modules`, `node_modules`, true},
		{`app/Node_Modules`, `Node_Modules`, true},
	}
	for _, c := range mustSkip {
		if !m.MatchEntry(c.rel, c.name, c.dir) {
			t.Errorf("expected skip %s", c.rel)
		}
	}

	mustKeep := []struct {
		rel, name string
		dir       bool
	}{
		{`.`, `src`, true},
		{`src`, `src`, true},
		{`gitignore`, `gitignore`, false},
		{`app/.gitignore`, `.gitignore`, false},
		{`app/modules`, `modules`, true},
	}
	for _, c := range mustKeep {
		if m.MatchEntry(c.rel, c.name, c.dir) {
			t.Errorf("did not expect skip %s", c.rel)
		}
	}
}

func TestMatchPathPrefix(t *testing.T) {
	m, err := Compile([]string{`^build/`})
	if err != nil {
		t.Fatal(err)
	}
	if !m.MatchEntry(`build`, `build`, true) {
		t.Fatal("directory build should match ^build/ via trailing-slash check")
	}
	if !m.MatchEntry(`build/bin/app.exe`, `app.exe`, false) {
		t.Fatal("file under build/ should match ^build/")
	}
	if m.MatchEntry(`src/build`, `build`, true) {
		t.Fatal("nested folder named build should not match ^build/")
	}
}

func TestCompileInvalid(t *testing.T) {
	if _, err := Compile([]string{`(`}); err == nil {
		t.Fatal("expected invalid pattern error")
	}
}
