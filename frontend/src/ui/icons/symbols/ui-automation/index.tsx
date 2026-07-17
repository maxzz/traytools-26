export * from "./1-uia-toolbar";
export * from "./2-uia-tooltip";
export * from "./3-uia-tooltip2";

import { SvgSymbol_uia_Toolbar } from "./1-uia-toolbar";
import { SvgSymbol_uia_Tooltip } from "./2-uia-tooltip";
import { SvgSymbol_uia_Tooltip2 } from "./3-uia-tooltip2";

export function DefUiAutomationTypes() {
    return (<>
        {SvgSymbol_uia_Toolbar()}
        {SvgSymbol_uia_Tooltip()}
        {SvgSymbol_uia_Tooltip2()}
    </>);
}
