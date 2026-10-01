import React, { ForwardRefExoticComponent, RefAttributes } from "react";
import { LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ButtonSizeEnum, ColorEnum } from "./_enums";

interface UiControlsButtonProps {
    icon: ForwardRefExoticComponent<
        Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >;
    label: string;
    color?: string;
    textColor?: string;
    round?: boolean;
    size?: string;
    onClick?: () => void;
    badgeCount?: number;
    /** Lets an onboarding tip find and light this button. */
    onboardingTarget?: string;
}

const sizeMap: Record<ButtonSizeEnum, string> = {
    large: "h-10 w-10",
    regular: "h-9 w-9",
    small: "h-8 w-8",
};

const textColorMap: Record<ColorEnum, string> = {
    darkRed: "text-red-900",
    darkGreen: "text-red-900",
    red: "text-red-600",
    green: "text-green-600",
    normal: "wd-text-primary",
};

const buttonColorMap: Record<ColorEnum, string> = {
    darkRed: "bg-red-950",
    darkGreen: "bg-green-950",
    red: "bg-red-600",
    green: "bg-green-600",
    normal: "wd-bg-elevated",
};

function UiControlsButton({
    icon: Icon,
    label,
    color = ColorEnum.normal,
    textColor = ColorEnum.normal,
    round = false,
    size = ButtonSizeEnum.regular,
    onClick,
    badgeCount,
    onboardingTarget,
}: UiControlsButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger className="cursor-pointer relative">
                <Button
                    onClick={onClick}
                    data-onboarding-target={onboardingTarget}
                    variant="default"
                    size="icon"
                    className={`cursor-pointer dark wd-bg-elevated hover:bg-[var(--wd-surface-base)] hover:text-[var(--wd-text-primary)]
                        ${buttonColorMap[color as ColorEnum]}
                        ${sizeMap[size as ButtonSizeEnum]}
                        ${textColorMap[textColor as ColorEnum]}
                        ${round ? "rounded-full" : null}
                        `}
                >
                    {<Icon />}
                </Button>
                {badgeCount !== undefined && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-[var(--wd-danger)] text-white text-xs font-bold rounded-full px-1">
                        {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                )}
            </TooltipTrigger>
            <TooltipContent>
                <span className="">{label}</span>
            </TooltipContent>
        </Tooltip>
    );
}

export default UiControlsButton;
