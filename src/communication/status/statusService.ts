import { usePresenceStore } from "@/common/store/presenceStore";
import type { StatusDefinition } from "@/common/store/presenceStore";
import useUserStore from "@/common/store/useStore";

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
        }
        return StatusClientService.instance;
    }

    static getInstance(): StatusClientService {
        if (!StatusClientService.instance) {
            throw new Error("StatusClientService not initialized");
        }
        return StatusClientService.instance;
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
}
