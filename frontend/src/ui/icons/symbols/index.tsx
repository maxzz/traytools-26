import { UISymbolDefsInject } from "./symbols-inject";
import { DefAppTypes } from "./app";
import { DefAllOtherTypes } from "./all-other";
import { DefUiAutomationTypes } from "./ui-automation";
import { DefControlTypes } from "./controls";

export * from "./app";
export * from "./all-other";
export * from "./controls";
export * from "./ui-automation";

export function UISymbolDefs() {
    return (
        <UISymbolDefsInject>
            {DefAppTypes()}
            {DefAllOtherTypes()}
            {DefUiAutomationTypes()}
            {DefControlTypes()}
        </UISymbolDefsInject>
    );
}
