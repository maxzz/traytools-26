import { type RegConfig } from "./9-types-registry";

export const DEFAULT_REGISTRY_CONFIG: RegConfig = {
    groups: [
        {
            name: "Example",
            items: [
                {
                    keyPath: "HKCU",
                    values: [
                        {
                            valueName: "",
                            valueType: "REG_SZ",
                            newValue: "",
                        },
                    ],
                },
            ],
        },
    ],
};
