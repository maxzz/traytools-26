import { type RegConfig } from "./9-types-registry";

export const DEFAULT_REGISTRY_CONFIG: RegConfig = {
    groups: [
        {
            name: "Example",
            requireElevated: false,
            items: [
                {
                    hive: "HKCU",
                    keyPath: "",
                    valueName: "",
                    valueType: "REG_SZ",
                    newValue: "",
                    requireElevated: false,
                },
            ],
        },
    ],
};
