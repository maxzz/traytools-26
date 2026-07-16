import { SpyTestAllIcons } from "./spy-test-all-icons";
import { SpyTestAllSvgSymbols } from "./spy-test-all-svg-symbols";
import * as allIconsModule from "@/ui/icons/normal";
import type { ComponentType, SVGProps } from "react";

// Filter out non-function values from the allIcons module.
const allIcons = Object.fromEntries(
    Object.entries(allIconsModule).filter(([, value]) => typeof value === "function")
) as Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export function SpyAllIcons({ includeSvgSymbols }: { includeSvgSymbols?: boolean; }) {
    return (
        <div className="m-2 bg-sky-50/70 border-sku-500 border rounded shadow-sm">

            <div className="px-2 mt-1 text-sm font-semibold">Normal icons</div>
            <SpyTestAllIcons className="mx-auto px-2 py-2" allIcons={allIcons} />

            {includeSvgSymbols && <>
                <div className="mt-4 px-2 text-sm font-semibold">SVG symbols</div>
                <SpyTestAllSvgSymbols className="mx-auto px-2 pt-2" />
            </>}
        </div>
    );
}
