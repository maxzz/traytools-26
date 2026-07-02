// Package toolsmenu implements the configurable "Tools" menu. It loads a JSON
// definition (tools.json) that describes a nested menu of commands: folders to
// open, registry keys to navigate to, executables/URLs to launch, and
// separators. The parsed tree is handed to the frontend for rendering, and each
// executable leaf is assigned a stable id so the frontend can ask the backend
// to run it without ever passing raw paths back across the bridge.
package toolsmenu

// MenuNode mirrors a single entry in tools.json. A node is one of:
//   - a separator      (MenuName == "-")
//   - a sub-menu        (has MenuItems)
//   - a command         (has CmdLine)
//
// The JSON tags match the legacy traytools tools.json format exactly so old
// configuration files keep working unchanged.
type MenuNode struct {
	MenuName  string     `json:"menuName"`
	CmdLine   string     `json:"cmdLine,omitempty"`
	CmdArgs   string     `json:"cmdArgs,omitempty"`
	CmdPlat   string     `json:"cmdPlat,omitempty"` // curr | 32 | 64 | both
	CmdWhat   string     `json:"cmdWhat,omitempty"` // rel | abs | reg
	HotKey    string     `json:"hotKey,omitempty"`
	MenuItems []MenuNode `json:"menuItems,omitempty"`
}

// MenuConfig is the root object of tools.json.
type MenuConfig struct {
	Menu MenuNode `json:"menu"`
}

// Node kinds reported to the frontend.
const (
	KindItem      = "item"
	KindSubmenu   = "submenu"
	KindSeparator = "separator"
)

// cmdWhat values.
const (
	whatRel = "rel"
	whatAbs = "abs"
	whatReg = "reg"
)

// MenuView is the render-ready tree sent to the frontend. Command leaves carry
// an ID that maps to a resolved command kept on the Manager.
type MenuView struct {
	Name     string     `json:"name"`
	Kind     string     `json:"kind"`
	ID       int        `json:"id,omitempty"`
	What     string     `json:"what,omitempty"`   // rel | abs | reg (for icon hints)
	HotKey   string     `json:"hotKey,omitempty"`
	Children []MenuView `json:"children,omitempty"`
}

// MenuResponse is returned by the "getMenu" command.
type MenuResponse struct {
	Found bool      `json:"found"`
	Path  string    `json:"path"`
	Root  *MenuView `json:"root,omitempty"`
	Error string    `json:"error,omitempty"`
}

// resolvedCommand is the executable form of a command leaf, produced while the
// tree is built and looked up later by the "exec" command.
type resolvedCommand struct {
	what string // rel | abs | reg
	path string // absolute path, URL, or registry key path
	args string
	plat string // curr | 32 | 64 | both
}
