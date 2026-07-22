package tracemanager

import "strconv"

// The legacy trace text can start with a color marker: TRACECOLOR_PREFIX, two
// hex digits (0..0F) and TRACECOLOR_SUFIX (see atl_trace.h). Example: the
// magenta marker is "'`I0D`'". The 16 entries below match the console color
// palette used by the original tracewindow_listview_t::append_tracecall.
const (
	traceColorPrefix = "'`I"
	traceColorSuffix = "`'"
)

// TraceColorHex maps a 0..15 color index to an RGB string. The values match
// the comments in atl_trace.h (WCOLOR_* macros).
var TraceColorHex = [16]string{
	"#000000", // 00 black
	"#000080", // 01 navy
	"#008000", // 02 green
	"#008080", // 03 teal
	"#800000", // 04 maroon
	"#800080", // 05 purple
	"#808000", // 06 olive
	"#c0c0c0", // 07 silver
	"#808080", // 08 gray
	"#0000ff", // 09 blue
	"#00ff00", // 10 lime
	"#00ffff", // 11 cyan
	"#ff0000", // 12 red
	"#ff00ff", // 13 magenta
	"#ffff00", // 14 yellow
	"#ffffff", // 15 white
}

// parseTraceColor detects and strips a leading color marker. It returns the
// color index (0..15) or -1 when there is no marker, together with the text
// that remains after the marker is removed.
func parseTraceColor(text string) (colorIndex int, stripped string) {
	const numberSize = 2
	total := len(traceColorPrefix) + numberSize + len(traceColorSuffix)

	if len(text) < total {
		return -1, text
	}
	if text[:len(traceColorPrefix)] != traceColorPrefix {
		return -1, text
	}

	numStart := len(traceColorPrefix)
	numEnd := numStart + numberSize
	if text[numEnd:numEnd+len(traceColorSuffix)] != traceColorSuffix {
		return -1, text
	}

	n, err := strconv.ParseInt(text[numStart:numEnd], 16, 32)
	if err != nil || n < 0 || n > 15 {
		return -1, text
	}

	return int(n), text[total:]
}
