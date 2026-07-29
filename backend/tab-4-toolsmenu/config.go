package toolsmenu

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// EnvOverride, when set, points directly at a tools.json file. It takes
// precedence over every other search location and is handy for development.
const EnvOverride = "TRAYTOOLS_TOOLS"

// appConfigDirName is the per-user config sub-directory (matches options.go).
const appConfigDirName = "traytools-26-go"

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

// writeConfigPath returns the path tools.json should be written to when the
// user creates/saves it from the editor. If a config file already exists it is
// overwritten in place; otherwise a default per-user location is used so the
// write always succeeds:
//
//	<userConfigDir>/<app>/tools/tools.json
//
// The returned path's parent directory is created if needed.
func writeConfigPath() (string, error) {
	if path, found := findConfigPath(); found {
		return path, nil
	}

	cfg, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(cfg, appConfigDirName, "tools")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "tools.json"), nil
}

// readRawConfig returns the raw (unparsed) tools.json text from the current
// search location together with its path. found is false when no file exists.
func readRawConfig() (content string, path string, found bool, err error) {
	path, found = findConfigPath()
	if !found {
		return "", "", false, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", path, true, err
	}
	return string(data), path, true, nil
}

// saveRawConfig writes content to the write path (creating parent dirs) and
// returns the path it was written to.
func saveRawConfig(content string) (string, error) {
	path, err := writeConfigPath()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
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

func hasPathSeparator(p string) bool {
	return strings.ContainsAny(p, `/\`) || filepath.VolumeName(p) != ""
}

// splitFileArgs separates an executable/target from trailing arguments when the
// user put both on cmdLine.
//
// Quoted targets keep the legacy fnames::splitfilenameargs behavior (a leading
// quoted segment is the target; an unterminated leading quote falls through).
//
// Unquoted targets with spaces are resolved against the filesystem (CreateProcess-
// style, longest match first): the longest prefix that exists on disk is the
// target and the remainder is args. baseDir, when non-empty, is used to resolve
// relative candidates. If nothing matches and the string looks like a path
// (drive, UNC, or separators), the whole string is kept as the target so paths
// with spaces from the file picker work without quotes. Bare names without
// separators still fall back to a first-space split.
func splitFileArgs(s, baseDir string) (target, args string) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", ""
	}
	if s[0] == '"' {
		if end := strings.IndexByte(s[1:], '"'); end >= 0 {
			return s[1 : 1+end], strings.TrimSpace(s[1+end+1:])
		}
		// Unterminated quote: fall through.
	}
	if isURL(s) || !strings.ContainsRune(s, ' ') {
		return s, ""
	}

	for _, cand := range spacePrefixCandidates(s) {
		if targetExists(cand, baseDir) {
			return cand, strings.TrimSpace(s[len(cand):])
		}
	}

	// Nothing on disk matched. Prefer the full string when it looks like a
	// filesystem path — silent truncation at the first space is worse than a
	// clear "not found" for the path the user actually configured.
	if hasPathSeparator(s) {
		return s, ""
	}

	i := strings.IndexByte(s, ' ')
	return s[:i], strings.TrimSpace(s[i+1:])
}

// spacePrefixCandidates returns s itself, then each prefix ending at a space,
// longest first. Used to prefer a real path with spaces over a shorter token.
func spacePrefixCandidates(s string) []string {
	out := []string{s}
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] != ' ' {
			continue
		}
		cand := strings.TrimRight(s[:i], " ")
		if cand != "" {
			out = append(out, cand)
		}
	}
	return out
}

// targetExists reports whether candidate is a usable launch target: an existing
// file/dir (absolute, or relative to baseDir), or a bare name found on PATH.
func targetExists(candidate, baseDir string) bool {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return false
	}

	check := candidate
	if baseDir != "" && !filepath.IsAbs(candidate) {
		check = filepath.Join(baseDir, filepath.FromSlash(candidate))
	}
	if _, err := os.Stat(check); err == nil {
		return true
	}
	if filepath.IsAbs(candidate) || hasPathSeparator(candidate) {
		return false
	}
	_, err := exec.LookPath(candidate)
	return err == nil
}

// effectiveElevated reports whether a command should run elevated. An explicit
// runElevated wins; otherwise registry actions default to true and everything
// else to false (mirrors the frontend editor).
func effectiveElevated(n MenuNode, what string) bool {
	if n.RunElevated != nil {
		return *n.RunElevated
	}
	return what == whatReg
}

// resolveCommand turns a command node into its executable form. Path/registry
// interpretation happens here; the platform layer only performs the launch.
func resolveCommand(baseDir string, n MenuNode) resolvedCommand {
	what := strings.ToLower(strings.TrimSpace(n.CmdWhat))
	if what != whatAbs && what != whatReg {
		what = whatRel // default
	}

	elevated := effectiveElevated(n, what)

	if what == whatReg {
		return resolvedCommand{
			what:     whatReg,
			path:     strings.TrimSpace(n.CmdLine),
			plat:     n.CmdPlat,
			elevated: elevated,
		}
	}

	// Expand env before splitting so existence checks see real paths
	// (e.g. %UserProfile%\My Tools\app.exe).
	target := expandEnv(strings.TrimSpace(n.CmdLine))
	args := expandEnv(strings.TrimSpace(n.CmdArgs))
	if args == "" {
		checkBase := ""
		if what == whatRel {
			checkBase = baseDir
		}
		target, args = splitFileArgs(target, checkBase)
	}

	if what == whatAbs {
		if !isURL(target) {
			target = toBackslashes(target)
		}
		return resolvedCommand{what: whatAbs, path: target, args: args, plat: n.CmdPlat, elevated: elevated}
	}

	// Relative to the tools folder.
	target = toBackslashes(target)
	full := filepath.Join(baseDir, target)
	// filepath.Join strips a trailing separator; keep it so a folder target
	// still opens Explorer rather than being ambiguous.
	if strings.HasSuffix(target, `\`) && !strings.HasSuffix(full, string(os.PathSeparator)) {
		full += string(os.PathSeparator)
	}
	return resolvedCommand{what: whatRel, path: full, args: args, plat: n.CmdPlat, elevated: elevated}
}
