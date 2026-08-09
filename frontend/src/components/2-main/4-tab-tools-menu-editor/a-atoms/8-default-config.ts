import { type ToolsConfig } from "./9-types-menu";

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
                    { menuName: "Calculator", cmdLine: "calc.exe", cmdWhat: "abs" },
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
