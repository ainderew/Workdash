import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { ProfilePopover } from "./ProfilePopover";
import type { ProfilePopoverState, SenderAvatar } from "./types";
import type { AwardTagData } from "@/communication/chatV2/_types";

type OpenArgs = {
    userId: number;
    name: string;
    avatar: SenderAvatar;
    anchorRect: DOMRect;
    preferredSide?: "left" | "right";
    awardTag?: AwardTagData | null;
};

type Controller = {
    openFromAnchor: (args: OpenArgs) => void;
    openFromCoords: (
        state: ProfilePopoverState,
        awardTag?: AwardTagData | null,
    ) => void;
    close: () => void;
    openUserId: number | null;
};

type InternalState = {
    popover: ProfilePopoverState;
    awardTag: AwardTagData | null;
};

const ControllerContext = createContext<Controller | null>(null);

export function ProfilePopoverProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [state, setState] = useState<InternalState | null>(null);

    const openFromAnchor = useCallback(
        ({
            userId,
            name,
            avatar,
            anchorRect,
            preferredSide,
            awardTag,
        }: OpenArgs) => {
            const side = preferredSide ?? "right";
            const x = side === "left" ? anchorRect.left : anchorRect.right;
            const y = anchorRect.top;
            const anchorBottom = anchorRect.top > window.innerHeight / 2;

            setState({
                popover: {
                    x,
                    y,
                    anchorBottom,
                    anchorRect,
                    preferredSide: side,
                    senderUserId: userId,
                    senderName: name,
                    senderAvatar: avatar,
                },
                awardTag: awardTag ?? null,
            });
        },
        [],
    );

    const openFromCoords = useCallback(
        (popover: ProfilePopoverState, awardTag?: AwardTagData | null) => {
            setState({ popover, awardTag: awardTag ?? null });
        },
        [],
    );

    const close = useCallback(() => setState(null), []);

    const controller = useMemo<Controller>(
        () => ({
            openFromAnchor,
            openFromCoords,
            close,
            openUserId: state?.popover.senderUserId ?? null,
        }),
        [openFromAnchor, openFromCoords, close, state?.popover.senderUserId],
    );

    return (
        <ControllerContext.Provider value={controller}>
            {children}
            {/* Portalled so a transformed ancestor (the world-mode chat drawer
                slides in with translate-x) can't offset the fixed popover. */}
            {state &&
                createPortal(
                    <ProfilePopover
                        popover={state.popover}
                        onClose={close}
                        onAvatarUpdated={(avatar) => {
                            setState((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          popover: {
                                              ...prev.popover,
                                              senderAvatar: avatar,
                                          },
                                      }
                                    : prev,
                            );
                        }}
                        awardTag={state.awardTag}
                    />,
                    document.body,
                )}
        </ControllerContext.Provider>
    );
}

export function useProfilePopoverController(): Controller {
    const ctx = useContext(ControllerContext);
    if (!ctx) {
        throw new Error(
            "useProfilePopoverController must be used inside <ProfilePopoverProvider>",
        );
    }
    return ctx;
}
