# traytools

## Table of contents

- [Introduction](#introduction)
- [Screenshots](#screenshots)
  - [Welcome](#welcome)
  - [Copy Operations](#copy-operations)
  - [Sync](#sync)
  - [Registry](#registry)
  - [Tools](#tools)
  - [Windows](#windows)
  - [Active Monitor](#active-monitor)
  - [Trace Bits](#trace-bits)
  - [Options](#options)
- [Feature details](#feature-details)
  - [Welcome](#welcome-1)
  - [Copy Operations](#copy-operations-1)
  - [Sync](#sync-1)
  - [Registry](#registry-1)
  - [Tools](#tools-1)
  - [Windows](#windows-1)
  - [Active Monitor](#active-monitor-1)
  - [Trace Bits](#trace-bits-1)
  - [Options & system tray](#options--system-tray)
- [Building](#building)
- [Additional information](#additional-information)

---

## Introduction

**traytools** is a Windows-only desktop utility suite — a Swiss Army knife for everyday power-user and developer workflows. It lives in the system tray and gathers several specialized tools into one place: file copy batches, folder sync, curated registry edits, a customizable tools menu, window inspection, input-state monitoring, and diagnostic tracing.

The app is built with [Wails](https://wails.io) (Go backend + React/TypeScript frontend) and targets **Windows** as its primary platform. Many features depend on Win32 APIs (registry, elevation, window enumeration, hooks) and are not intended for other operating systems.

Repository: [github.com/maxzz/traytools-26](https://github.com/maxzz/traytools-26)

---

## Screenshots

Screenshots below follow the order of files in [`frontend/src/assets/previews`](frontend/src/assets/previews).

### Welcome

![Welcome](frontend/src/assets/previews/2026,08.09.26_0_tab_welcome.png)

Landing page with quick links to the main tools, version, and build date.

### Copy Operations

![Copy Operations](frontend/src/assets/previews/2026,08.09.26_1_tab_copy-ops.png)

Grouped one-file copy tasks with elevation, DpAgent stop, and a live operation log.

### Sync

![Sync](frontend/src/assets/previews/2026,08.09.26_2_tab_sync.png)

Folder-pair sync and comparison (forward, reverse, check, and detailed diff report).

### Registry

![Registry](frontend/src/assets/previews/2026,08.09.26_3_tab_registry.png)

Curated registry keys with staged “new” vs live “current” values and batch read/write.

### Tools

![Tools](frontend/src/assets/previews/2026,08.09.26_4_tab_tools.png)

Editable launch menu for folders, programs, URLs, and Regedit jumps — driven by `tools.json`.

### Windows

![Windows](frontend/src/assets/previews/2026,08.09.26_5_tab_windows.png)

Process/window tree with Win32 properties inspector and optional on-screen auto-highlight.

### Active Monitor

![Active Monitor](frontend/src/assets/previews/2026,08.09.26_6_tab_acitve.png)

Live view of foreground, active, focus, and capture windows plus the attached thread.

### Trace Bits

![Trace Bits](frontend/src/assets/previews/2026,08.09.26_7_tab_trace.png)

Per-process hook/trace log viewer with category bitmasks for filtering diagnostic output.

### Options

![Options](frontend/src/assets/previews/2026,08.09.26_8_tab_options.png)

Application settings: elevation, tray/taskbar behavior, UI chrome, theme, and related preferences.

---

## Feature details

### Welcome

The home screen lists the main modules as navigation shortcuts and shows the current version and last-updated timestamp. Use it as a quick jump pad when you are not already on a working tab.

### Copy Operations

Config-driven file copies organized as **Groups → items** in `copy.json` (search order similar to other config files; override with `%TRAYTOOLS_COPY%`).

- Each item is a **source file → destination folder** pair.
- Options per item or group: **Stop DpAgent before copy**, **Copy with elevated privileges**, **Rename destination if locked**.
- Copy a single item or an entire parent group (group flags apply for group runs; DpAgent is stopped once per batch when requested).
- Paths support typing, browse dialogs, and drag-and-drop; the bottom panel logs status for each run.
- If elevation is required and the app is not elevated, you are prompted to relaunch elevated and then re-run the copy.
- Toolbar supports reload, import/export, and apply; unsaved edits are tracked as **Changed**.

### Sync

Folder synchronization and comparison driven by `sync.json` (override with `%TRAYTOOLS_SYNC%` when set).

- Tree of groups and **folder pairs** (`sourceFolder` / `destinationFolder`); nesting is supported.
- Actions on the selected pair: **Sync →**, **Sync ←**, **Check**, **Check Details**.
- Sync uses the shared `copy-no-nm` sync/check logic in-process (not a separate CLI spawn). Destructive deletes follow the Recycle Bin path used by that library.
- **Check Details** can open as a dialog or appear in the Sync bottom panel — controlled in Settings.
- Same editor patterns as Copy Operations: dirty tracking, import/export, reveal on disk.

### Registry

A safer, project-oriented alternative to browsing all of Regedit: manage named groups of keys/values in `registry.json` (override with `%TRAYTOOLS_REGISTRY%`).

- Side-by-side **New value** (desired) vs **Current** (live registry) for each value.
- Read/write single items or whole groups; HKLM and similar hives require elevation.
- Supported types include `REG_SZ`, `REG_EXPAND_SZ`, `REG_DWORD`, `REG_QWORD`, `REG_BINARY`, `REG_MULTI_SZ`, with optional 32/64-bit view.
- Import/export as JSON or Windows `.reg` (UTF-16LE); drop `.reg`/`.json` onto the tree to create a group.
- Jump to the key in Regedit; operation history appears in the bottom report panel.

### Tools

Data-driven launcher and Regedit shortcuts, edited in the UI and stored in `tools.json`. See [`tools/tools.md`](tools/tools.md) for the full schema.

- Menu items can open folders, run programs, open URLs, or jump Regedit to a key (`cmdWhat`: `rel` | `abs` | `reg`).
- Nested sub-menus, separators, hotkey labels, and `%ENV%` expansion are supported.
- Config search order: `%TRAYTOOLS_TOOLS%` → next to the exe → current working directory → `%AppData%\traytools-26-go\…`.
- Changes apply when the menu is reopened (no app restart required for menu content).
- Launching and Regedit navigation are Windows-only.

### Windows

Spy++-style inspection of the live window hierarchy.

- Filter by class or title; refresh the tree; optional **Auto-highlight** draws a blinking rectangle over the selected window’s screen bounds.
- Inspector shows caption, class, HWND, styles, rectangles, parent/owner, and process details (PID, path, architecture, user, integrity).
- Empty or off-screen bounds can flash a notice on the selected row when highlight notices are enabled.

### Active Monitor

Real-time poll of local input ownership (legacy “Watch Input” view).

- Shows **Foreground**, **Active**, **Focus**, **Capture**, and the foreground **Thread**.
- Backend uses `AttachThreadInput` so active/focus/capture reflect the observed app, not traytools itself.
- Start/stop monitoring from the toolbar; useful when debugging focus steals and capture locks.

### Trace Bits

Diagnostic trace manager for hooked/traced processes and category bitmasks.

- Left: process list plus a color-coded log for the selected PID (filter, auto-scroll, color toggles).
- Right: **Trace categories** checklist with load/save, import/export, and registry helpers (**Reg User**, **Dp Reg**).
- Categories control which messages/events are collected (major events, critical hook install/uninstall, window-position messages, exclusions for Explorer/Office, and so on).

### Options & system tray

Settings (gear) and tray behavior shape how the app stays out of the way while remaining available.

Typical options:

- Run traytools elevated / start DPAgent elevated
- Always on top; show or hide the taskbar icon
- Quit on close vs keep running from the tray
- Show main tabs, DPAgent monitor in the header, window footer
- Sync Check Details placement; theme (e.g. Light) and theme-toggle visibility

**System tray:** clicking the tray icon toggles show/hide. When the taskbar icon is hidden, the tray is the primary way to restore the window. Preferences that must survive restarts are stored in `init.json` under the app config directory; UI preferences also use local storage in the WebView.

---

## Building

### Requirements

- **Windows** (amd64) — primary target
- [Go](https://go.dev/dl/) 1.22+ (see `go.mod`)
- [Node.js](https://nodejs.org/) with [pnpm](https://pnpm.io/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2 (`wails doctor` to verify WebView2 / toolchain)

### Install dependencies

```shell
# From the repository root
pnpm --prefix frontend install

# Or via the root script
pnpm run frontend:install
```

Install the Wails CLI if needed (see also [`scripts/install-wails-cli.sh`](scripts/install-wails-cli.sh)).

### Development

```shell
# Hot reload (Go + frontend). Uses the frontend Vite watcher configured in wails.json.
pnpm run dev
# equivalent: wails dev
```

Optionally run the frontend alone:

```shell
pnpm run frontend:dev
```

### Production / debug build (Windows)

```shell
pnpm run build
# equivalent:
# wails build --clean --platform windows/amd64 -debug -devtools -ldflags "-H windowsgui"
```

The executable is written under `build/bin/` (e.g. `traytools-26.exe` per `wails.json`).

Shell helper: [`scripts/build-windows.sh`](scripts/build-windows.sh).

### Useful checks

```shell
pnpm run go:fmt
pnpm run go:vet
pnpm run go:test
pnpm run wails:doctor
```

---

## Additional information

| Topic | Notes |
| --- | --- |
| Platform | **Windows only** for production use. Non-Windows stubs exist so the project can compile in limited form; registry, copy elevation, Regedit jump, window tree, and similar features require Windows. |
| Stack | Go + Wails v2 backend; React, TypeScript, Vite, Tailwind CSS frontend; Jotai + Valtio for UI/state. |
| Config files | `tools.json`, `copy.json`, `sync.json`, `registry.json` — typically under `tools/` next to the exe, cwd, or AppData. Env overrides: `TRAYTOOLS_TOOLS`, `TRAYTOOLS_COPY`, `TRAYTOOLS_SYNC`, `TRAYTOOLS_REGISTRY`. |
| App options | `init.json` in the per-user app config directory (elevation, taskbar icon, quit-on-close, etc.). |
| Tools schema | Documented in [`tools/tools.md`](tools/tools.md). |
| License | MIT (see `package.json`). |
| Author | Max Zakharzhevskiy |

Sample configs live in the [`tools/`](tools) folder (`tools.json`, `sync.json`, `registry.json`, and related examples). Place working copies where the search order can find them, or point the corresponding `TRAYTOOLS_*` environment variable at a file during development.
