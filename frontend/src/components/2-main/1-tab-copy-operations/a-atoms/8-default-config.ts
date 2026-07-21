import { type CopyConfig } from "./9-types-copy";

export const DEFAULT_COPY_CONFIG: CopyConfig = {
    groups: [
        {
            name: "Example",
            stopDpAgent: true,
            requireElevated: false,
            items: [
                {
                    sourceFile: "",
                    destFolder: "",
                    stopDpAgent: false,
                    requireElevated: false,
                },
            ],
        },
    ],
};
