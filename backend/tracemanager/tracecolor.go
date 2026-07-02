package tracemanager

// Trace color encoding replicates the legacy TRACECOLOR_PREFIX/SUFIX scheme
// from atl_tracing.h: a fixed prefix, a 2-hex-digit color index (0..15), and a
// fixed suffix, embedded at the start of the trace text. The frontend strips
// this prefix to recover the color and the remaining text.

const (
	traceColorPrefix = "\x01\x02" // TRACECOLOR_PREFIX stand-in (2 bytes)
	traceColorSuffix = "\x03"     // TRACECOLOR_SUFIX stand-in (1 byte)
)

// formatTraceColor wraps a trace text with the color index marker so the
// frontend can apply the legacy 16-color highlighting.
func formatTraceColor(color int, text string) string {
	return traceColorPrefix + fmtHex2(color) + traceColorSuffix + text
}

// fmtHex2 returns a two-character lower-case hex representation of n (0..255).
func fmtHex2(n int) string {
	const hex = "0123456789abcdef"
	return string([]byte{hex[(n>>4)&0xF], hex[n&0xF]})
}
