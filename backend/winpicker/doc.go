//go:build windows

// Package winpicker implements a Spy++-style window finder: a low-level
// mouse hook tracks the cursor outside the app, reports the process that
// owns the window under the cursor, and restores the cursor on button-up.
//
// The package is framework-independent. The Wails bindings layer streams
// JSON events to the renderer; the React control only displays that state.
package winpicker
