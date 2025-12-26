import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import React from "react";

function SidebarHeader({
    children: subHeader,
    title,
    onClose,
}: {
    children?: React.ReactNode;
    title?: string;
    onClose: () => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-neutral-700 z-50">
            <div className="flex flex-col">
                <span className="font-bold text-lg">{title}</span>
                {subHeader}
            </div>
            <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
                <X className="h-5 w-5" />
            </Button>
        </div>
    );
}
export default SidebarHeader;
