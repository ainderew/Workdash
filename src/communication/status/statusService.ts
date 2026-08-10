import { usePresenceStore } from "@/common/store/presenceStore";
import type {
    CustomStatus,
    StatusDefinition,
} from "@/common/store/presenceStore";
import useUserStore from "@/common/store/useStore";

export const CUSTOM_STATUS_TEXT_MAX_LENGTH = 100;

export class StatusClientService {
    private static instance: StatusClientService;
    private socket: SocketIOClient.Socket;
    private initialized = false;

    private constructor(socket: SocketIOClient.Socket) {
        this.socket = socket;
    }

    static init(socket: SocketIOClient.Socket): StatusClientService {
        if (!StatusClientService.instance) {
            StatusClientService.instance = new StatusClientService(socket);
        } else {
            StatusClientService.instance.socket.off("user:status-changed");
            StatusClientService.instance.socket.off(
                "user:custom-status-changed",
            );
            StatusClientService.instance.socket = socket;
            StatusClientService.instance.initialized = false;
            StatusClientService.instance.setupListeners();
        }
        return StatusClientService.instance;
    }

    static getInstance(): StatusClientService {
        if (!StatusClientService.instance) {
            throw new Error("StatusClientService not initialized");
        }
        return StatusClientService.instance;
    }

    static isInitialized(): boolean {
        return !!StatusClientService.instance && StatusClientService.instance.socket.connected;
    }

    setupListeners(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.socket.on(
            "user:status-changed",
            (payload: {
                userId: number;
                statusId: string;
                label: string;
                color: string;
                icon: string | null;
                manualLock: boolean;
            }) => {
                const presence = {
                    statusId: payload.statusId,
                    label: payload.label,
                    color: payload.color,
                    icon: payload.icon,
                    manualLock: payload.manualLock,
                };
                usePresenceStore.getState().setPresence(payload.userId, presence);

                const currentUserId = useUserStore.getState().backendUser?.id;
                if (
                    typeof currentUserId === "number" &&
                    payload.userId === currentUserId
                ) {
                    usePresenceStore.getState().setMyStatus(presence);
                }
            },
        );

        this.socket.on(
            "user:custom-status-changed",
            (payload: {
                userId: number;
                customStatus: CustomStatus | null;
            }) => {
                usePresenceStore
                    .getState()
                    .setCustomStatus(payload.userId, payload.customStatus);
            },
        );
    }

    async fetchDefinitions(): Promise<void> {
        return new Promise((resolve) => {
            this.socket.emit(
                "status:definitions:list",
                {},
                (response: {
                    ok: boolean;
                    data?: {
                        definitions: StatusDefinition[];
                    };
                    error?: string;
                }) => {
                    if (response.ok && response.data?.definitions) {
                        const store = usePresenceStore.getState();
                        store.setDefinitions(response.data.definitions);

                        const defs = usePresenceStore.getState().definitions;
                        const currentUserId = useUserStore.getState().backendUser?.id;
                        const existingPresence =
                            typeof currentUserId === "number"
                                ? store.presenceMap[currentUserId]
                                : undefined;

                        if (existingPresence && defs[existingPresence.statusId]) {
                            store.setMyStatus(existingPresence);
                        } else {
                            const onlineDef = defs["online"];
                            if (onlineDef) {
                                store.setMyStatus({
                                    statusId: "online",
                                    label: onlineDef.label,
                                    color: onlineDef.color,
                                    icon: onlineDef.icon,
                                    manualLock: false,
                                });
                            }
                        }
                    }
                    resolve();
                },
            );
        });
    }

    emitActivityHeartbeat(): void {
        this.socket.emit("user:activity:heartbeat");
    }

    async setStatus(
        statusId: "online" | "away" | "focus",
    ): Promise<boolean> {
        const store = usePresenceStore.getState();
        const def = store.definitions[statusId];
        const previousStatus = store.myStatus;

        // Optimistic update: apply immediately for real-time feel
        if (def) {
            const newPresence = {
                statusId: def.id,
                label: def.label,
                color: def.color,
                icon: def.icon,
                manualLock: statusId !== "online",
            };
            store.setMyStatus(newPresence);

            const currentUserId = useUserStore.getState().backendUser?.id;
            if (typeof currentUserId === "number") {
                store.setPresence(currentUserId, newPresence);
            }
        }

        return new Promise((resolve) => {
            this.socket.emit(
                "user:status:set",
                { statusId },
                (response: { ok: boolean; error?: string }) => {
                    if (!response.ok) {
                        // Revert optimistic update on failure
                        usePresenceStore
                            .getState()
                            .setMyStatus(previousStatus);
                        const currentUserId = useUserStore.getState().backendUser?.id;
                        if (typeof currentUserId === "number") {
                            usePresenceStore
                                .getState()
                                .setPresence(currentUserId, previousStatus);
                        }
                    }
                    resolve(response.ok);
                },
            );
        });
    }

    /**
     * Set the user's custom status (emoji and/or text). Applies optimistically
     * and reverts if the server rejects.
     */
    async setCustomStatus(customStatus: CustomStatus): Promise<boolean> {
        const emoji = customStatus.emoji?.trim() || null;
        const text =
            customStatus.text?.trim().slice(0, CUSTOM_STATUS_TEXT_MAX_LENGTH) ||
            null;

        if (!emoji && !text) return this.clearCustomStatus();

        return this.emitCustomStatus("user:custom-status:set", {
            emoji,
            text,
        });
    }

    async clearCustomStatus(): Promise<boolean> {
        return this.emitCustomStatus("user:custom-status:clear", null);
    }

    private emitCustomStatus(
        event: "user:custom-status:set" | "user:custom-status:clear",
        next: CustomStatus | null,
    ): Promise<boolean> {
        const store = usePresenceStore.getState();
        const currentUserId = useUserStore.getState().backendUser?.id;
        const previous =
            typeof currentUserId === "number"
                ? (store.customStatusMap[currentUserId] ?? null)
                : null;

        // Optimistic update so the picker closes onto the new value instantly.
        if (typeof currentUserId === "number") {
            store.setCustomStatus(currentUserId, next);
        }

        return new Promise((resolve) => {
            this.socket.emit(
                event,
                next ?? {},
                (response: { ok: boolean; error?: string }) => {
                    if (!response.ok && typeof currentUserId === "number") {
                        usePresenceStore
                            .getState()
                            .setCustomStatus(currentUserId, previous);
                    }
                    resolve(response.ok);
                },
            );
        });
    }
}
