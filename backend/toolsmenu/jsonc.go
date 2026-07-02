package toolsmenu

import "strings"

// stripJSONComments makes the legacy tools.json parseable by encoding/json.
//
// The historical files are JSON with "//" line comments and "/* */" block
// comments (and occasionally trailing commas). This preprocessor removes those
// while respecting string literals, so values such as "http://example.com" are
// left untouched.
func stripJSONComments(src string) string {
	var b strings.Builder
	b.Grow(len(src))

	inString := false
	escaped := false

	for i := 0; i < len(src); i++ {
		c := src[i]

		if inString {
			b.WriteByte(c)
			switch {
			case escaped:
				escaped = false
			case c == '\\':
				escaped = true
			case c == '"':
				inString = false
			}
			continue
		}

		switch {
		case c == '"':
			inString = true
			b.WriteByte(c)
		case c == '/' && i+1 < len(src) && src[i+1] == '/':
			// Line comment: skip to end of line (keep the newline).
			for i < len(src) && src[i] != '\n' {
				i++
			}
			if i < len(src) {
				b.WriteByte('\n')
			}
		case c == '/' && i+1 < len(src) && src[i+1] == '*':
			// Block comment: skip to closing */.
			i += 2
			for i+1 < len(src) && !(src[i] == '*' && src[i+1] == '/') {
				i++
			}
			i++ // land on '/', loop's i++ moves past it
		default:
			b.WriteByte(c)
		}
	}

	return removeTrailingCommas(b.String())
}

// removeTrailingCommas deletes commas that directly precede a closing } or ]
// (ignoring whitespace), which JSON forbids but the legacy files may contain
// after a comment line is stripped.
func removeTrailingCommas(src string) string {
	var b strings.Builder
	b.Grow(len(src))

	inString := false
	escaped := false

	for i := 0; i < len(src); i++ {
		c := src[i]

		if inString {
			b.WriteByte(c)
			switch {
			case escaped:
				escaped = false
			case c == '\\':
				escaped = true
			case c == '"':
				inString = false
			}
			continue
		}

		if c == '"' {
			inString = true
			b.WriteByte(c)
			continue
		}

		if c == ',' {
			// Look ahead past whitespace for a closing bracket.
			j := i + 1
			for j < len(src) && (src[j] == ' ' || src[j] == '\t' || src[j] == '\r' || src[j] == '\n') {
				j++
			}
			if j < len(src) && (src[j] == '}' || src[j] == ']') {
				continue // drop this comma
			}
		}

		b.WriteByte(c)
	}

	return b.String()
}
