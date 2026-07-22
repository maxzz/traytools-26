//go:build windows

package winapp

import (
	"context"
	"reflect"
	"unsafe"

	"github.com/wailsapp/go-webview2/pkg/edge"
)

// SetWebviewZoom applies the native WebView2 page-zoom factor (the same zoom the
// Chromium engine uses for Ctrl+/- in a browser, which correctly scales the
// whole page including viewport units).
//
// Wails v2 only exposes the zoom factor as a startup option (windows.ZoomFactor)
// and provides no public runtime API to change it. We therefore reach into the
// unexported Windows frontend stored in the runtime context to obtain the
// WebView2 controller (*edge.Chromium) and the main window, then set the factor
// on the UI thread via the window's Invoke dispatcher (WebView2 COM calls must
// run on the thread that created the controller).
//
// This relies on Wails internals (verified against wails v2.12.0 /
// go-webview2 v1.0.22) and may need revisiting on a dependency upgrade.
func SetWebviewZoom(ctx context.Context, factor float64) {
	if ctx == nil {
		return
	}
	fe := ctx.Value("frontend")
	if fe == nil {
		return
	}
	feVal := reflect.ValueOf(fe)
	if feVal.Kind() != reflect.Ptr || feVal.IsNil() {
		return
	}

	// In production the value is the desktop *windows.Frontend directly; under
	// `wails dev` it is a *devserver.DevWebServer that embeds the desktop
	// frontend as an anonymous `frontend.Frontend` field. Unwrap until we reach
	// the struct that actually owns the WebView2 controller.
	feStruct, ok := resolveDesktopFrontend(feVal.Elem())
	if !ok {
		return
	}

	chromium, ok := unexportedField[*edge.Chromium](feStruct, "chromium")
	if !ok || chromium == nil {
		return
	}

	mainWindow, ok := unexportedValue(feStruct, "mainWindow")
	if !ok || mainWindow.IsNil() {
		// Fall back to a direct call; may be a no-op if off the UI thread.
		chromium.PutZoomFactor(factor)
		return
	}

	invoke := mainWindow.MethodByName("Invoke")
	if !invoke.IsValid() {
		chromium.PutZoomFactor(factor)
		return
	}

	invoke.Call([]reflect.Value{reflect.ValueOf(func() {
		chromium.PutZoomFactor(factor)
	})})
}

// resolveDesktopFrontend walks embedded frontend wrappers (e.g. the dev
// server's DevWebServer) until it finds the struct that owns the `chromium`
// field, returning that addressable struct value.
func resolveDesktopFrontend(v reflect.Value) (reflect.Value, bool) {
	for range [8]struct{}{} {
		if v.Kind() != reflect.Struct {
			return reflect.Value{}, false
		}
		if v.FieldByName("chromium").IsValid() {
			return v, true
		}
		emb := v.FieldByName("Frontend")
		if !emb.IsValid() || emb.Kind() != reflect.Interface || emb.IsNil() {
			return reflect.Value{}, false
		}
		concrete := emb.Elem()
		if concrete.Kind() == reflect.Ptr {
			if concrete.IsNil() {
				return reflect.Value{}, false
			}
			concrete = concrete.Elem()
		}
		v = concrete
	}
	return reflect.Value{}, false
}

// unexportedValue returns an addressable, usable reflect.Value for the named
// (possibly unexported) field, clearing the read-only flag via unsafe.
func unexportedValue(s reflect.Value, name string) (reflect.Value, bool) {
	f := s.FieldByName(name)
	if !f.IsValid() || !f.CanAddr() {
		return reflect.Value{}, false
	}
	return reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem(), true
}

// unexportedField reads an unexported field of type T from struct value s.
func unexportedField[T any](s reflect.Value, name string) (T, bool) {
	var zero T
	v, ok := unexportedValue(s, name)
	if !ok {
		return zero, false
	}
	out, ok := v.Interface().(T)
	if !ok {
		return zero, false
	}
	return out, true
}
