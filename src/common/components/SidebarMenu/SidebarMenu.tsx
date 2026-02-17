import React, { useEffect, useState } from "react";

type SidebarMenuVariant = "default" | "desk-chat";

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

    if (!shouldRender) return null;

    const variantClassName = variant === "desk-chat"
        ? "w-full sm:w-[540px] md:w-[560px] wd-bg-app border-l wd-border-subtle"
        : "w-128 text-white bg-primary border-l border-neutral-700 backdrop-blur-sm";

    return (
        <div
            className={`overflow-hidden fixed right-0 top-0 h-[100dvh] z-50 ${variantClassName}
              ${isOpen ? "translate-x-0" : "translate-x-full"} transition-all duration-150 ease-in-out flex flex-col shadow-2xl`}
        >
            {children}
        </div>
    );
}

export default SidebarMenu;
