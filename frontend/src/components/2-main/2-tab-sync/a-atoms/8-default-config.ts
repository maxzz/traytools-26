import { type SyncConfig } from "./9-types-sync";

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
    groups: [
        {
            name: "Example",
            items: [
                {
                    sourceFolder: "",
                    destFolder: "",
                },
            ],
        },
    ],
};
