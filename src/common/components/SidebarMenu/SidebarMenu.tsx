import React, { useEffect, useState } from "react";

type SidebarMenuVariant = "default" | "desk-chat";

let openSidebarCount = 0;
let previousBodyOverflow = "";
let previousBodyOverscroll = "";

const lockBodyScroll = () => {
    if (typeof document === "undefined") return;

    if (openSidebarCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        previousBodyOverscroll = document.body.style.overscrollBehavior;
    }

    openSidebarCount += 1;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
};

const unlockBodyScroll = () => {
    if (typeof document === "undefined") return;

    openSidebarCount = Math.max(0, openSidebarCount - 1);
    if (openSidebarCount > 0) return;

    document.body.style.overflow = previousBodyOverflow;
    document.body.style.overscrollBehavior = previousBodyOverscroll;
};

function SidebarMenu({
    isOpen,
    variant = "default",
    children,
}: {
    isOpen: boolean;
    variant?: SidebarMenuVariant;
    children: React.ReactNode;
}) {
    const [shouldRender, setShouldRender] = useState(isOpen);
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isOpen) {
            setShouldRender(true);
        } else {
            timeout = setTimeout(() => setShouldRender(false), 300);
        }
        return () => clearTimeout(timeout);
    }, [isOpen]);

    useEffect(() => {
        if (!shouldRender) return;

        lockBodyScroll();
        return () => {
            unlockBodyScroll();
        };
    }, [shouldRender]);

    if (!shouldRender) return null;

    const variantClassName = variant === "desk-chat"
        ? "w-full max-w-[95vw] sm:w-[640px] md:w-[760px] lg:w-[860px] wd-bg-app border-l wd-border-subtle"
        : "w-128 text-white bg-primary border-l border-neutral-700 backdrop-blur-sm";

    return (
        <div
            className={`overflow-hidden fixed inset-y-0 right-0 h-full max-h-screen z-50 ${variantClassName}
              ${isOpen ? "translate-x-0" : "translate-x-full"} transition-all duration-150 ease-in-out flex flex-col shadow-2xl`}
        >
            {children}
        </div>
    );
}
export default SidebarMenu;
