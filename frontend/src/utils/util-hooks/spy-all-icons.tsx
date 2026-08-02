import { type ComponentType, type SVGProps, useMemo } from "react";
import * as allIconsModule from "@/ui/icons/normal";
import { SpyTestAllIcons } from "./spy-test-all-icons";
import { SpyTestAllSvgSymbols } from "./spy-test-all-svg-symbols";

export function SpyAllIcons({ includeSvgSymbols }: { includeSvgSymbols?: boolean; }) {
    // Build inside the component (memoized) so a circular `@/utils` ↔ icons import
    // cannot read icon exports at module init while they are still in the TDZ.
    const allIcons = useMemo(
        () => {
            const icons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {};
            for (const key of Object.keys(allIconsModule)) {
                try {
                    const value = (allIconsModule as Record<string, unknown>)[key];
                    if (typeof value === "function") {
                        icons[key] = value as ComponentType<SVGProps<SVGSVGElement>>;
                    }
                } catch {
                    // Skip bindings that are still uninitialized due to circular imports.
                }
            }
            return icons;
        },
        []);

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
