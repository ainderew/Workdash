import React from "react";
import { Map, Monitor } from "lucide-react";
import useUiStore from "@/common/store/uiStore";

interface ModeSwitchButtonProps {
    className?: string;
    iconSize?: number;
    showLabel?: boolean;
}

/**
 * Switches between world and desk mode. Every surface that offers the switch
 * renders this one component so the icon, label and accessible name stay in
 * sync. The keyboard shortcut (mod+D) and the `?mode=` query param drive the
 * same store action.
 */
export function ModeSwitchButton({
    className = "",
    iconSize = 15,
    showLabel = false,
}: ModeSwitchButtonProps) {
    const interactionMode = useUiStore((state) => state.interactionMode);
    const toggleInteractionMode = useUiStore(
        (state) => state.toggleInteractionMode,
    );

    const isWorld = interactionMode === "world";
    const Icon = isWorld ? Monitor : Map;
    const label = isWorld ? "Desk Mode" : "2D Mode";

    return (
        <button
            type="button"
            onClick={toggleInteractionMode}
            title={`Switch to ${label}`}
            aria-label={`Switch to ${label}`}
            className={className}
        >
            <Icon size={iconSize} />
            {showLabel && <span>{label}</span>}
        </button>
    );
}

export default ModeSwitchButton;
