# Background utility application design
_Exported on 6/20/2026 at 20:14:24 PDT from Cursor (3.8.11)_

---

**User**

This application will function as a background utility; closing the main window should minimize it to the system tray. 
The application will be shut down via a menu item within the frontend component. 
Additionally, a top-level shandcn menu must be implemented in the frontend; initially, it will contain a single menu "File" with single item "Exit" item. 
Clicking "Exit" item will send a request to the backend part of application to close this process.
A communication structure between the frontend and backend must be implemented to handle the numerous calls; these calls need to be grouped to prevent interference with one another. 

---

**Cursor**

I'll explore the project structure first to understand what I'm working with.

This is a Wails (Go + React) project. Let me look at the key backend and frontend files.

Let me explore the backend folder and frontend structure more.

Let me look at a few more files to understand the frontend patterns (store, app entry, dialogs).

This is a substantial, architecturally meaningful task (system tray lifecycle + a structured frontend↔backend communication layer), so I'll switch to Plan mode to design it with you before writing code.

I've explored the codebase. It's a Wails v2 (v2.12.0) + React/shadcn app. Before I write a plan, I need to resolve two architectural decisions that significantly change the implementation.

Key findings:
- `main.go` uses `OnBeforeClose: app.BeforeClose` which currently returns `false` (allows quit). `StartHidden: true` is already set.
- Wails v2.12.0 has no built-in system tray API, so a tray needs a third-party library.
- Backend methods are currently all flat on a single `App` struct in `backend/app.go`, auto-bound and exposed via `frontend/wailsjs/go/backend/App.js`.
- A shadcn `menubar.tsx` component already exists, ready to use.

**Architecture decisions**

> **How should the frontend<->backend 'grouped communication structure' be implemented? This is the biggest design decision.**
> - Single command-bus: one bound Go method Dispatch(group, command, payloadJSON), with a registry of named groups and a per-group mutex so calls in the same group serialize (prevent interference) while different groups run concurrently. Frontend gets a typed client wrapping it. (Recommended) ✔
> - Multiple bound Wails service structs (e.g. AppService, WindowService, SettingsService) so calls are grouped by service via Wails' auto-generated typed bindings. Simpler, idiomatic Wails, but no per-group serialization.
> - Command-bus design, but you decide remaining details

> **System tray requires a third-party library since Wails v2 has none built in. Which approach?**
> - Add github.com/energye/systray (non-blocking Register, designed to coexist with the Wails event loop; uses existing build/windows/icon.ico). (Recommended) ✔
> - Use github.com/getlantern/systray
> - Let me pick / I have a preferred library

Both decisions noted: command-bus design and `energye/systray`. Let me verify the current `energye/systray` API for Wails integration before finalizing.

I have everything I need. `energye/systray` exposes `systray.Run(onReady, onExit)` (run in a goroutine), with `AddMenuItem(...).Click(...)`, `SetOnClick`, `SetOnRClick(menu.ShowMenu)`, and works alongside the Wails event loop. The repo already has `build/windows/icon.ico` and `build/appicon.png` for the tray icon.

Here is my plan.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the plan. Let me start by loading the todos and beginning with the command bus.

Now creating the command bus package.

Now updating `backend/app.go`.

Now update `BeforeClose` to hide-to-tray unless an exit was requested.

Now the tray. Let me add the dependency and create `backend/tray.go`.

Let me add the systray dependency and build to verify the API signatures.

Now update `main.go` to embed the tray icon and pass it to the app.

Build succeeded (the output was just dependency downloads). Let me run a clean build and vet to confirm.

Build and vet pass. Let me format the Go files.

Now hand-add `Dispatch` to the generated bindings.

Let me check the path alias config before writing the bridge imports.

`@` maps to `src` only, so I'll use a relative import to reach `wailsjs`. Creating the bridge client.

Now create the `AppMenubar` component and wire it into the header.

Now let me check for lint errors on the edited frontend files and run the frontend build.

Now the frontend build. Let me check the build script and run it.

Let me verify dependencies are installed, then run the frontend build.

Frontend build passes. Let me run `go mod tidy` and a final backend build/vet to finalize.

All checks pass. Let me confirm `energye/systray` landed as a direct dependency in `go.mod`.

All implementation work is complete and verified. Let me mark the final todo done.

The plan is fully implemented and all builds pass. Here's a summary of what was done.

## Backend (Go)

- **Command bus** — new [backend/bus/bus.go](backend/bus/bus.go): a `Bus` with named groups, each guarded by its own `sync.Mutex`. `Dispatch` holds the owning group's lock for the handler's duration, so same-group calls serialize (no interference) while different groups run concurrently. Duplicate registrations panic (programmer error).
- **App lifecycle** — [backend/app.go](backend/app.go):
  - New fields `bus`, `quitRequested`, `trayIcon`; `NewApp()` builds the bus and calls `registerHandlers()` (the `app` group: `exit`, `show`, `hide`).
  - Single bound entry point `Dispatch(group, command, payloadJSON)` that routes through the bus and returns a JSON string envelope.
  - `RequestExit()` sets `quitRequested` then `runtime.Quit`.
  - `BeforeClose` now hides the window to the tray unless an exit was explicitly requested — making it a background utility.
- **System tray** — new [backend/tray.go](backend/tray.go) using `github.com/energye/systray` (run in a goroutine from `Startup`): icon + `Show`/`Exit` menu items, left-click restores the window, right-click opens the menu. Both tray `Exit` and the menu `Exit` route through `RequestExit()`.
- [main.go](main.go) embeds `build/windows/icon.ico` (and the existing `appicon.png`), selecting per platform, and passes it via `SetTrayIcon`.

## Frontend (React/TS)

- **Bridge client** — new `frontend/src/bridge/`: `dispatch(group, command, payload?)` wraps the bound `Dispatch`, and `appBus` ([groups/app.ts](frontend/src/bridge/groups/app.ts)) exposes typed `exit/show/hide`. New groups just get their own file, mirroring the backend.
- **Menu** — new [9-app-menubar.tsx](frontend/src/components/1-header/9-app-menubar.tsx) using the existing shadcn `Menubar`: a `File` menu with a single `Exit` item that calls `appBus.exit()`, wired into the [header](frontend/src/components/1-header/index.tsx).
- Added `Dispatch` to the generated bindings ([App.js](frontend/wailsjs/go/backend/App.js) / [App.d.ts](frontend/wailsjs/go/backend/App.d.ts)) so the frontend compiles immediately (Wails will keep these in sync on `wails dev`/`build`).

## Verification

- `go build ./...`, `go vet ./...`, and `go mod tidy` all succeed; `energye/systray v1.0.3` is a direct dependency.
- Frontend `pnpm run build` (tsc + vite) succeeds with no lint errors.

One thing to note for runtime testing: the close-to-tray and tray behavior needs `wails dev` / a built binary to verify interactively (I couldn't exercise the tray from here). The behavioral expectations are: window close button → hides to tray; tray left-click or "Show" → restores; File > Exit or tray "Exit" → terminates the process.

---

**User**

Very good. Now we need to implement the following logic: when the system icon is clicked, if the application is already open, the window should become hidden; if it is not yet open, it should be opened. In other words, we need toggle logic instead of the current "show window" logic.

---

**Cursor**

Good idea. The Wails v2 runtime has no "is visible" query, so I'll track visibility state in the `App` and route all show/hide through helpers, then make the tray click toggle. Let me re-read the current files.

I'll add window-visibility tracking with a mutex and toggle helpers in a new `backend/window.go`, then route all show/hide through them.

Now update the `App` struct and route the bus handlers and `BeforeClose` through the helpers.

Now update `restoreWindowOptions` in `options.go` so the visibility flag is accurate after the initial show.

Now update the tray so left-click toggles and the "Show" menu item uses the helper.

`tray.go` no longer uses `runtime` directly. Let me check and remove the unused import.

Let me add `toggle` to the frontend `appBus` group for parity, then add the frontend binding isn't needed (Dispatch already covers it). Update the group.

Now build and vet to verify.

Done. Tray-click toggle logic is implemented.

## What changed

Since Wails v2 has no "is the window visible" query, I track visibility in the `App` and route every show/hide path through shared helpers so the state stays accurate.

- New [backend/window.go](backend/window.go): `showWindow()`, `hideWindow()`, and `toggleWindow()`, all guarded by a `sync.Mutex` (the tray runs on its own goroutine, so this prevents races with bus calls). `toggleWindow` hides if currently shown, otherwise unminimises + shows.
- [backend/app.go](backend/app.go): added `windowMu sync.Mutex` and `windowVisible bool` fields; the `app` bus group now uses the helpers and gained a `toggle` command; `BeforeClose` hides via `hideWindow()`.
- [backend/options.go](backend/options.go): `restoreWindowOptions` now sets `windowVisible = true` after the initial show, so the first tray click correctly hides.
- [backend/tray.go](backend/tray.go): left-click now calls `toggleWindow()` (was always-show); the `Show` menu item uses `showWindow()`; removed the now-unused `runtime` import.
- [frontend/src/bridge/groups/app.ts](frontend/src/bridge/groups/app.ts): added `appBus.toggle()` for parity.

`go build` and `go vet` pass; no frontend lint errors.

Behavior now: clicking the tray icon hides the window if it's open, or opens it if it's hidden. Right-click still shows the tray menu; `Show`/`Exit` and the `File > Exit` menu work as before. As before, the toggle interaction itself needs `wails dev` or a built binary to exercise live.

