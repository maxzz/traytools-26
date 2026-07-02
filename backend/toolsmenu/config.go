package toolsmenu

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// EnvOverride, when set, points directly at a tools.json file. It takes
// precedence over every other search location and is handy for development.
const EnvOverride = "TRAYTOOLS_TOOLS"

// appConfigDirName is the per-user config sub-directory (matches options.go).
const appConfigDirName = "tm-template-go-26"

// findConfigPath returns the first existing tools.json from the search order:
//
//  1. $TRAYTOOLS_TOOLS                                 (explicit override)
//  2. <exeDir>/tools/tools.json, <exeDir>/tools.json   (installed next to app)
//  3. ./tools/tools.json, ./tools.json                 (working directory, dev)
//  4. <userConfigDir>/<app>/tools/tools.json, .../tools.json
//
// It returns ("", false) when none exists.
func findConfigPath() (string, bool) {
	var candidates []string

	if v := strings.TrimSpace(os.Getenv(EnvOverride)); v != "" {
		candidates = append(candidates, v)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(dir, "tools", "tools.json"),
			filepath.Join(dir, "tools.json"),
		)
	}

	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "tools", "tools.json"),
			filepath.Join(wd, "tools.json"),
		)
	}

	if cfg, err := os.UserConfigDir(); err == nil {
		base := filepath.Join(cfg, appConfigDirName)
		candidates = append(candidates,
			filepath.Join(base, "tools", "tools.json"),
			filepath.Join(base, "tools.json"),
		)
	}

	for _, c := range candidates {
		if c == "" {
			continue
		}
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			abs, err := filepath.Abs(c)
			if err != nil {
				abs = c
			}
			return abs, true
		}
	}

	return "", false
}

// loadConfig reads and parses tools.json, returning the parsed config and the
// base directory that relative ("rel") commands are resolved against (the
// directory that holds tools.json).
func loadConfig(path string) (*MenuConfig, string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, "", err
	}

	cleaned := stripJSONComments(string(data))

	var cfg MenuConfig
	if err := json.Unmarshal([]byte(cleaned), &cfg); err != nil {
		return nil, "", err
	}

	return &cfg, filepath.Dir(path), nil
}

// ---------------------------------------------------------------------------
// Command resolution

var (
	envVarRe = regexp.MustCompile(`%([^%]+)%`)
	urlRe    = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9+.\-]*://`)
)

// expandEnv expands %VAR% references (Windows style). Unknown variables are
// left as-is so the failure is visible rather than silently blank.
func expandEnv(s string) string {
	return envVarRe.ReplaceAllStringFunc(s, func(m string) string {
		name := m[1 : len(m)-1]
		if v, ok := os.LookupEnv(name); ok {
			return v
		}
		return m
	})
}

func isURL(s string) bool { return urlRe.MatchString(s) }

func toBackslashes(s string) string { return strings.ReplaceAll(s, "/", `\`) }

// splitFileArgs separates an executable/target from trailing arguments when the
// user put both on cmdLine. It is quote-aware: a leading quoted segment is the
// target and the remainder is the arguments; otherwise it splits on the first
// space. Targets without a space (folders, URLs, plain exes) are returned whole.
func splitFileArgs(s string) (target, args string) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", ""
	}
	if s[0] == '"' {
		if end := strings.IndexByte(s[1:], '"'); end >= 0 {
			return s[1 : 1+end], strings.TrimSpace(s[1+end+1:])
		}
		return strings.Trim(s, `"`), ""
	}
	if i := strings.IndexByte(s, ' '); i >= 0 {
		return s[:i], strings.TrimSpace(s[i+1:])
	}
	return s, ""
}

// resolveCommand turns a command node into its executable form. Path/registry
// interpretation happens here; the platform layer only performs the launch.
func resolveCommand(baseDir string, n MenuNode) resolvedCommand {
	what := strings.ToLower(strings.TrimSpace(n.CmdWhat))
	if what != whatAbs && what != whatReg {
		what = whatRel // default
	}

	if what == whatReg {
		return resolvedCommand{
			what: whatReg,
			path: strings.TrimSpace(n.CmdLine),
			plat: n.CmdPlat,
		}
	}

	target := n.CmdLine
	args := n.CmdArgs
	if args == "" {
		target, args = splitFileArgs(target)
	} else {
		target = strings.TrimSpace(target)
	}

	target = expandEnv(target)
	args = expandEnv(args)

	if what == whatAbs {
		if !isURL(target) {
			target = toBackslashes(target)
		}
		return resolvedCommand{what: whatAbs, path: target, args: args, plat: n.CmdPlat}
	}

	// Relative to the tools folder.
	target = toBackslashes(target)
	full := filepath.Join(baseDir, target)
	// filepath.Join strips a trailing separator; keep it so a folder target
	// still opens Explorer rather than being ambiguous.
	if strings.HasSuffix(target, `\`) && !strings.HasSuffix(full, string(os.PathSeparator)) {
		full += string(os.PathSeparator)
	}
	return resolvedCommand{what: whatRel, path: full, args: args, plat: n.CmdPlat}
}
