import { type HTMLAttributes } from "react"; // it is IconPictureInPicture, but with a different rectangle width
import { classNames } from "@/utils";

export function IconAppMini({ className, title, fillClasses, ...rest }: HTMLAttributes<SVGSVGElement> & {fillClasses?: string}) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5px]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M21.07,13.59v4.39c0,1.07-.87,1.93-1.93,1.93H3.79c-1.07,0-1.93-.87-1.93-1.93V7.04c0-1.07.87-1.93,1.93-1.93h6.36" />
            <rect className={fillClasses} x="8.51" y="4.08" width="13.63" height="7.4" rx="1.81" ry="1.81"/>
        </svg>
    );
}
