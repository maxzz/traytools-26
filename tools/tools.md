# `tools.json` — Tools menu configuration

This folder holds the configuration for the application's **Tools** menu. The
menu is fully data-driven: on open, the backend reads `tools.json`, and the
frontend renders the described tree of commands — folders to open, registry keys
to navigate to, executables/URLs to launch, separators, and nested sub-menus.
Edit the file and reopen the menu to see changes (no restart required).

- Backend: `backend/toolsmenu/`
- Frontend bridge: `frontend/src/bridge/groups/tools.ts`
- Frontend UI: `frontend/src/components/1-header/a-tools-menu.tsx`
- Working sample: `tools/tools.json` (this folder)

## Contents

- [Where the file is loaded from (search order)](#where-the-file-is-loaded-from-search-order)
- [File format](#file-format)
  - [Top-level shape](#top-level-shape)
  - [Node types](#node-types)
  - [Node fields](#node-fields)
- [`cmdWhat` — how `cmdLine` is interpreted](#cmdwhat--how-cmdline-is-interpreted)
  - [`rel` (default) — path relative to this folder](#rel-default--path-relative-to-this-folder)
  - [`abs` — absolute path or URL](#abs--absolute-path-or-url)
  - [`reg` — registry key](#reg--registry-key)
- [Environment variables](#environment-variables)
- [Arguments](#arguments)
- [Platform notes](#platform-notes)
- [Notes on behavior vs. the legacy traytools](#notes-on-behavior-vs-the-legacy-traytools)

---

## Where the file is loaded from (search order)

The first existing file wins:

1. `%TRAYTOOLS_TOOLS%` — an environment variable pointing directly at a JSON file (handy for development).
2. `<exeDir>\tools\tools.json`, then `<exeDir>\tools.json` — next to the installed executable.
3. `.\tools\tools.json`, then `.\tools.json` — the current working directory (this is what `wails dev` uses from the project root).
4. `%AppData%\tm-template-go-26\tools\tools.json`, then `…\tools.json` — the per-user config directory.

If no file is found, the **Tools** menu shows a single disabled *"No tools.json found"* item.

---

## File format

Standard JSON with two conveniences:

- `//` line comments and `/* … */` block comments are allowed.
- A trailing comma before a `}` or `]` is tolerated.

Both are stripped before parsing; string values such as `https://example.com` are left untouched.

### Top-level shape

```json
{
    "menu": {
        "menuName": "Tools",
        "menuItems": [ /* nodes … */ ]
    }
}
```

`menu` is the root node. Its `menuName` is informational (the menu bar always
shows **Tools**); its `menuItems` array becomes the menu contents.

### Node types

Each entry in a `menuItems` array is one of three kinds, decided by its fields:

| Kind          | Condition                          | Rendered as               |
| ------------- | ---------------------------------- | ------------------------- |
| **Separator** | `menuName` is `"-"` (and no items) | a horizontal divider      |
| **Sub-menu**  | has a non-empty `menuItems` array  | a nested fly-out menu     |
| **Command**   | has a `cmdLine`                    | a clickable item that runs it |

Empty sub-menus (no valid children) are dropped automatically. Sub-menus can be nested to any depth.

### Node fields

| Field       | Applies to | Required | Description                                                                  |
| ----------- | ---------- | -------- | ---------------------------------------------------------------------------- |
| `menuName`  | all        | yes      | Display text. `"-"` means a separator.                                        |
| `menuItems` | sub-menu   | —        | Array of child nodes.                                                         |
| `cmdLine`   | command    | yes      | The target: a path, a registry key, or a URL (interpreted per `cmdWhat`).     |
| `cmdArgs`   | command    | no       | Explicit arguments. If omitted, arguments are split off the end of `cmdLine`. |
| `cmdWhat`   | command    | no       | `rel` (default) \| `abs` \| `reg`. How to interpret `cmdLine`.                |
| `cmdPlat`   | command    | no       | `curr` (default) \| `32` \| `64` \| `both`. Platform hint.                    |
| `hotKey`    | command    | no       | Shortcut text shown on the right of the item (e.g. `"F5"`). Display only.     |

---

## `cmdWhat` — how `cmdLine` is interpreted

### `rel` (default) — path relative to this folder

Resolved against the folder that contains `tools.json`. Opens files, folders,
shortcuts, or programs via the shell.

```json
{ "menuName": "Open tools folder", "cmdLine": "./",             "cmdWhat": "rel" }
{ "menuName": "My tool",           "cmdLine": "bin/mytool.exe", "cmdWhat": "rel" }
```

A trailing `/` (or `\`) marks a **folder**, which opens in Explorer.

### `abs` — absolute path or URL

Used as-is (after environment-variable expansion). Covers system programs,
absolute paths, and web links. Forward slashes are normalized to backslashes for
file paths, but URLs (anything with a `scheme://`) keep their slashes.

```json
{ "menuName": "Notepad",      "cmdLine": "notepad.exe",                                          "cmdWhat": "abs" }
{ "menuName": "UAC Settings", "cmdLine": "\"%windir%/system32/UserAccountControlSettings.exe\"", "cmdWhat": "abs" }
{ "menuName": "Sysinternals", "cmdLine": "https://learn.microsoft.com/sysinternals/",            "cmdWhat": "abs" }
```

### `reg` — registry key

Opens the **Registry Editor** navigated to the given key. Accepts the short hive
prefixes (`HKLM`, `HKCU`, `HKCR`, `HKCC`, `HKU`) or the full form
(`HKEY_LOCAL_MACHINE`, …).

```json
{ "menuName": "Regedit: DP Tracing", "cmdLine": "HKLM\\SOFTWARE\\DigitalPersona\\Tracing", "cmdWhat": "reg" }
```

Navigation (a Go port of the legacy `regeditutils::regeditjump`, in
`backend/winregedit`) works in every state:

- **Regedit not running:** its `LastKey`
  (`HKCU\Software\Microsoft\Windows\CurrentVersion\Applets\Regedit`) is set, then
  `regedit.exe` is launched and restores that key on start.
- **Regedit already open:** relaunching would only re-activate the existing
  window (it ignores `LastKey`), so its tree view is driven directly with
  key messages — collapse to the root, then expand/type down the path. If the
  final segment names a value rather than a key, that value is selected in the
  right-hand pane.

---

## Environment variables

`%NAME%` references in `cmdLine`/`cmdArgs` are expanded (e.g. `%AppData%`,
`%windir%`, `%TEMP%`). Unknown variables are left untouched so the problem is visible.

---

## Arguments

Provide arguments either inline on `cmdLine` or via a separate `cmdArgs`:

```json
{ "menuName": "Procmon", "cmdLine": "tools/procmon.exe -accepteula" }
{ "menuName": "Procmon", "cmdLine": "tools/procmon.exe", "cmdArgs": "-accepteula" }
```

When `cmdArgs` is omitted, the target is split from the arguments at the first
space. If the target itself contains spaces, wrap it in double quotes:

```json
{ "menuName": "App", "cmdLine": "\"C:/Program Files/App/app.exe\" --flag" }
```

---

## Platform notes

- Launching programs/folders and opening the Registry Editor are **Windows-only**. On other platforms the menu still loads and renders from `tools.json`, but selecting a command returns an error.
- `cmdPlat` is accepted and carried through. On modern Windows the unified Registry Editor shows both 32- and 64-bit views, so `reg` items behave the same regardless of the value.

---

## Notes on behavior vs. the legacy traytools

This implementation matches the original traytools `tools.json` schema and the
low-level helpers (`fnames::splitfilenameargs`, `environment::expandstring`,
`fnames::backslashesForce`, `CPUAS::correctForCurrentOS`). Two intentional
improvements:

- **URLs keep forward slashes.** The legacy code converted `/`→`\` on every path; here URLs are detected and left intact so web links open reliably.
- **Items are not hidden when the target is missing.** The legacy menu dropped `rel` entries whose file/folder did not exist. Here every configured item is shown; a missing target simply reports an error when clicked. This keeps the menu predictable while editing the config.

See `tools.json` in this folder for a complete working example.
