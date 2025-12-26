import React, { useEffect, useState } from "react";

function SidebarMenu({
    isOpen,
    children,
}: {
    isOpen: boolean;
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

    return (
        <div
            className={`overflow-hidden text-white h-full w-128 bg-primary backdrop-blur-sm fixed right-0 top-0 border-l border-neutral-700
              ${isOpen ? "translate-x-0" : "translate-x-full"} transition-all duration-150 ease-in-out flex flex-col shadow-2xl`}
        >
            {children}
        </div>
    );
}

export default SidebarMenu;
