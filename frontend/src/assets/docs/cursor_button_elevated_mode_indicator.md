# Button elevated mode indicator
_Exported on 6/25/2026 at 19:32:46 PDT from Cursor (3.9.8)_

---

**User**

@frontend/src/components/1-header/index.tsx:14 add before this button indicator is app running elevated or not

---

**Cursor**

I'll look at the header layout and how the app exposes elevated/admin status so we can add the indicator in the right place.


Adding a compact elevation indicator that calls the existing `settings/isElevated` backend API.


Added an elevation indicator in the header, placed before the theme toggle.

**New component** `7-elevated-indicator.tsx`:
- Calls the existing `settingsBus.isElevated()` backend API on mount
- Shows a compact badge with a colored dot and label:
  - **Elevated** — amber dot when running as administrator
  - **Standard** — muted dot when running with normal privileges
- Tooltip on hover explains the full status

**Updated** `index.tsx` to render `<ElevatedIndicator />` before `<ButtonThemeToggle />`.

The indicator uses the same `settings/isElevated` bus endpoint that already checks the Windows process token on the backend.

---

**User**

An option needs to be added to the settings dialog to determine what happens when the main window's "Close" button is clicked: 
if enabled, the window and the application will close; if disabled, the window will be minimized (which is the current behavior). 

---

**Cursor**

I'll trace how settings are persisted and how the main window handles the Close button so we can wire up the new option.


Implementing the setting end-to-end: backend persistence, `BeforeClose` behavior, and the settings dialog switch.


Added a **Quit when window close button is clicked** setting, wired through to window close behavior.

### Behavior
| Setting | Window close (X) |
|---------|------------------|
| **Off** (default) | Hides to tray — same as before |
| **On** | Saves window state and quits the app |

File → Exit and the tray Exit menu still quit explicitly as before.

### Changes

**Backend** (`init.json` → `quitOnClose`):
- `GetQuitOnCloseOption` / `SetQuitOnCloseOption` in `options.go`
- Bus handlers: `settings/getQuitOnClose`, `settings/setQuitOnClose`
- `BeforeClose` checks the option and either quits or hides to tray

**Frontend**:
- New switch in the Settings dialog
- Persists immediately via `settingsBus.setQuitOnClose`
- `SettingsQuitOnCloseSync` loads the saved value on startup

The setting takes effect immediately — no restart needed. With it off, clicking X keeps the app in the tray; with it on, the app exits.

