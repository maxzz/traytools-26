import { type HTMLAttributes, type SVGAttributes } from "react"; //https://en.wikipedia.org/wiki/File:Windows_11_registry_editor_icon.svg
import { classNames } from "@/utils";

export function SvgSymbolAppRegedit() { // Windows Registry Editor
    return (
        <symbol id="app-regedit" viewBox="0 0 256 256">
            <symbol id="app-regedit-cube">
                <path fill="#52d3ff" d="M50 50v36l-27-10v-36" />
                <path fill="#005782" d="M50 50v36l27-10v-36" />
                <path fill="#0088cc" d="M50 50l-27-10 27-10 27 10" />
            </symbol>
            <use href="#app-regedit-cube" x="76" y="63" />
            <use href="#app-regedit-cube" x="76" y="24" />
            <use href="#app-regedit-cube" x="45" y="113" />
            <use href="#app-regedit-cube" x="45" y="74" />
            <use href="#app-regedit-cube" x="45" y="35" />
            <use href="#app-regedit-cube" x="14" y="124" />
            <use href="#app-regedit-cube" x="14" y="85" />
            <use href="#app-regedit-cube" x="14" y="46" />
            <use href="#app-regedit-cube" x="107" y="113" />
            <use href="#app-regedit-cube" x="107" y="74" />
            <use href="#app-regedit-cube" x="107" y="35" />
            <use href="#app-regedit-cube" x="138" y="124" />
            <use href="#app-regedit-cube" x="138" y="85" />
            <use href="#app-regedit-cube" x="76" y="124" />
            <use href="#app-regedit-cube" x="76" y="85" />
            <use href="#app-regedit-cube" x="45" y="135" />
            <use href="#app-regedit-cube" x="107" y="135" />
            <use href="#app-regedit-cube" x="76" y="146" />
            <use href="#app-regedit-cube" transform="translate(119,-24) rotate(35, 50, 50)" />
            <use href="#app-regedit-cube" transform="translate(173,33) rotate(20, 50, 50)" />
        </symbol>
    );
}

export function SymbolAppRegedit({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 256 256" {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#app-regedit" />
        </svg>
    );
}
