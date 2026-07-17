import { SvgSymbolControlButton } from "./1-control-button";
import { SvgSymbolControlScrollbar } from "./2-control-scrollbar";
import { SvgSymbolControlSlider } from "./3-control-slider";
import { SvgSymbolControlStatusbar } from "./4-control-statusbar";
import { SvgSymbolControlTab } from "./5-control-tab";
import { SvgSymbolControlTabItem } from "./6-control-tabitem";
import { SvgSymbolControlThumb } from "./7-control-thumb";
import { SvgSymbolControlTitlebar } from "./8-control-titlebar";
import { SvgSymbolControlTooltip } from "./9-control-tooltip";
import { SvgSymbolControlWindow } from "./a-control-window";
import { SvgSymbolControlPane } from "./b-control-pane";
import { SvgSymbolControlGroup } from "./c-control-group";
import { SvgSymbolControlTreeRoot } from "./d-control-tree-root";
import { SvgSymbolControlTreeChild } from "./e-control-tree-child";

export * from "./1-control-button";
export * from "./2-control-scrollbar";
export * from "./3-control-slider";
export * from "./4-control-statusbar";
export * from "./5-control-tab";
export * from "./6-control-tabitem";
export * from "./7-control-thumb";
export * from "./8-control-titlebar";
export * from "./9-control-tooltip";
export * from "./a-control-window";
export * from "./b-control-pane";
export * from "./c-control-group";
export * from "./d-control-tree-root";
export * from "./e-control-tree-child";

export function DefControlTypes() {
    return (<>
        {SvgSymbolControlButton()}
        {SvgSymbolControlScrollbar()}
        {SvgSymbolControlSlider()}
        {SvgSymbolControlStatusbar()}
        {SvgSymbolControlTab()}
        {SvgSymbolControlTabItem()}
        {SvgSymbolControlThumb()}
        {SvgSymbolControlTitlebar()}
        {SvgSymbolControlTooltip()}
        {SvgSymbolControlWindow()}
        {SvgSymbolControlPane()}
        {SvgSymbolControlGroup()}
        {SvgSymbolControlTreeRoot()}
        {SvgSymbolControlTreeChild()}
    </>);
}
