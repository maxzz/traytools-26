import { proxy, subscribe } from "valtio";
import { toolsBus } from "@/bridge";

// ---------------------------------------------------------------------------
// Editable model
//
// These types mirror backend/toolsmenu.MenuNode (and the on-disk tools.json
// format) exactly, so the editor round-trips cleanly to the file the backend
// reads. A node is one of:
//   - a separator  ({ menuName: "-" })
//   - a sub-menu    (has menuItems[])
//   - a command     (has cmdLine)

export type CmdWhat = "rel" | "abs" | "reg";
export type CmdPlat = "curr" | "32" | "64" | "both";

export interface ToolMenuItem {
    menuName: string;
    cmdLine?: string;
    cmdArgs?: string;
    cmdPlat?: CmdPlat;
    cmdWhat?: CmdWhat;
    hotKey?: string;
    menuItems?: ToolMenuItem[];
}

export interface ToolsConfig {
    menu: ToolMenuItem;
}

// ---------------------------------------------------------------------------
// Default config — must correspond to the entries shipped in tools/tools.json.

export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
    menu: {
        menuName: "Tools",
        menuItems: [
            {
                menuName: "Registry",
                menuItems: [
                    { menuName: "Regedit: DP Tracing", cmdLine: "HKLM\\SOFTWARE\\DigitalPersona\\Tracing", cmdPlat: "both", cmdWhat: "reg" },
                    { menuName: "Regedit: DP Tracing VirtualStore", cmdLine: "HKCU\\Software\\Classes\\VirtualStore\\MACHINE\\SOFTWARE\\Wow6432Node\\DigitalPersona\\Tracing", cmdPlat: "both", cmdWhat: "reg" },
                    { menuName: "Regedit: Run keys", cmdLine: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", cmdWhat: "reg" },
                ],
            },
            { menuName: "-" },
            {
                menuName: "Folders",
                menuItems: [
                    { menuName: "Open tools folder", cmdLine: "./", cmdWhat: "rel" },
                    { menuName: "Open %AppData%", cmdLine: "%AppData%", cmdWhat: "abs" },
                    { menuName: "Open %TEMP%", cmdLine: "%TEMP%", cmdWhat: "abs" },
                ],
            },
            { menuName: "-" },
            {
                menuName: "Utilities",
                menuItems: [
                    { menuName: "Notepad", cmdLine: "notepad.exe", cmdWhat: "abs" },
                    { menuName: "Calculator", cmdLine: "calc.exe", cmdWhat: "abs", hotKey: "F4" },
                    { menuName: "-" },
                    { menuName: "UAC Settings", cmdLine: "\"%windir%/system32/UserAccountControlSettings.exe\"", cmdWhat: "abs" },
                ],
            },
            {
                menuName: "Web links",
                menuItems: [
                    { menuName: "Sysinternals", cmdLine: "https://learn.microsoft.com/sysinternals/", cmdWhat: "abs" },
                    { menuName: "Process Explorer", cmdLine: "https://learn.microsoft.com/sysinternals/downloads/process-explorer", cmdWhat: "abs" },
                ],
            },
        ],
    },
};

// ---------------------------------------------------------------------------
// Persistence

const STORAGE_ID = "traytools-26__tools__v1.0";

export type ToolsSource = "default" | "file" | "storage";

export interface ToolsEditorStore {
    config: ToolsConfig;   // the current editable tree
    source: ToolsSource;   // where `config` came from on the last load
    path: string;          // file path reported by the backend (load/save target)
    dirty: boolean;        // has the tree changed since last load/save
    status: string;        // last user-facing status message
    error: string;         // last error, if any
}

function cloneConfig(config: ToolsConfig): ToolsConfig {
    return structuredClone(config);
}

function readCache(): ToolsConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            return JSON.parse(stored) as ToolsConfig;
        }
    } catch (e) {
        console.error("Failed to read cached tools config", e);
    }
    return null;
}

function writeCache(config: ToolsConfig) {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify(config));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

export const toolsEditor = proxy<ToolsEditorStore>({
    config: readCache() ?? cloneConfig(DEFAULT_TOOLS_CONFIG),
    source: readCache() ? "storage" : "default",
    path: "",
    dirty: false,
    status: "",
    error: "",
});

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing.
subscribe(toolsEditor, () => {
    writeCache(toolsEditor.config);
});

// ---------------------------------------------------------------------------
// JSONC parsing (mirrors the backend jsonc stripper) so raw tools.json files
// with // and /* */ comments and trailing commas parse on the frontend too.

function stripJsonComments(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === "/" && src[i + 1] === "/") {
            while (i < src.length && src[i] !== "\n") {
                i++;
            }
            if (i < src.length) {
                out += "\n";
            }
            continue;
        }

        if (c === "/" && src[i + 1] === "*") {
            i += 2;
            while (i + 1 < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
                i++;
            }
            i++; // land on '/', loop's i++ moves past it
            continue;
        }

        out += c;
    }

    return removeTrailingCommas(out);
}

function removeTrailingCommas(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === ",") {
            let j = i + 1;
            while (j < src.length && /\s/.test(src[j])) {
                j++;
            }
            if (j < src.length && (src[j] === "}" || src[j] === "]")) {
                continue; // drop this comma
            }
        }

        out += c;
    }

    return out;
}

export function parseToolsJsonc(text: string): ToolsConfig {
    const parsed = JSON.parse(stripJsonComments(text)) as Partial<ToolsConfig>;
    if (!parsed || typeof parsed !== "object" || !parsed.menu) {
        throw new Error("tools.json must contain a top-level \"menu\" object");
    }
    return parsed as ToolsConfig;
}

// Serialize the current config to the on-disk JSON text (4-space indent).
export function serializeToolsConfig(config: ToolsConfig): string {
    return JSON.stringify(config, null, 4) + "\n";
}

// ---------------------------------------------------------------------------
// Mutations

export function setToolsConfig(config: ToolsConfig, source: ToolsSource, path = "") {
    toolsEditor.config = config;
    toolsEditor.source = source;
    toolsEditor.path = path;
    toolsEditor.dirty = false;
    toolsEditor.error = "";
}

export function markDirty() {
    toolsEditor.dirty = true;
}

export function resetToDefaults() {
    setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default");
    toolsEditor.dirty = true;
    toolsEditor.status = "Reset to default tools";
}

// ---------------------------------------------------------------------------
// Load / save flow
//
// On load: prefer the on-disk file (and cache it). If the file is missing, fall
// back to the previously cached (localStorage) version, then to the defaults.

export async function loadToolsConfig(): Promise<void> {
    try {
        const raw = await toolsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseToolsJsonc(raw.content);
                setToolsConfig(config, "file", raw.path);
                writeCache(config);
                toolsEditor.status = `Loaded from ${raw.path}`;
                return;
            } catch (e) {
                toolsEditor.error = `Invalid tools.json: ${String(e)}`;
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            setToolsConfig(cached, "storage", raw?.path ?? "");
            if (!toolsEditor.error) {
                toolsEditor.status = "File not found — using saved copy";
            }
            return;
        }

        setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "");
        if (!toolsEditor.error) {
            toolsEditor.status = "No tools.json — showing defaults";
        }
    } catch (e) {
        toolsEditor.error = `Failed to load tools menu: ${String(e)}`;
    }
}

export async function saveToolsConfig(): Promise<void> {
    try {
        const text = serializeToolsConfig(toolsEditor.config);
        const res = await toolsBus.save(text);
        toolsEditor.path = res?.path ?? toolsEditor.path;
        toolsEditor.source = "file";
        toolsEditor.dirty = false;
        toolsEditor.error = "";
        toolsEditor.status = `Saved to ${toolsEditor.path}`;
        writeCache(toolsEditor.config);
    } catch (e) {
        toolsEditor.error = `Failed to save tools.json: ${String(e)}`;
    }
}
