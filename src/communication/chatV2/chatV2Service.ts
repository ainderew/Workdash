import { MediaTransportService } from "@/communication/mediaTransportService/mediaTransportServive";
import type {
    ChatV2CreateAttachment,
    ChatV2Message,
    ChatV2Room,
    ChatV2RoomCategory,
    ChatV2RoomMember,
} from "./_types";
import { getStandaloneGifUrl } from "./gifUrl";

type AckResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

type RealtimeHandlers = {
    onMessageNew: (message: ChatV2Message) => void;
    onMessageUpdate: (message: ChatV2Message) => void;
    onMessageDelete: (payload: {
        roomId: string;
        messageId: string;
        deletedAt: string | Date | null;
    }) => void;
};

export class ChatV2Service {
    private static instance: ChatV2Service;

    private transport: MediaTransportService;

    private teardownRealtimeHandlers: (() => void) | null = null;

    constructor() {
        const jwtToken =
            typeof window !== "undefined" ? window.__BACKEND_JWT__ : "";
        this.transport = MediaTransportService.getInstance(jwtToken);
    }

    static getInstance() {
        if (!ChatV2Service.instance) {
            ChatV2Service.instance = new ChatV2Service();
        }
        return ChatV2Service.instance;
    }

    private emitWithAck<T>(
        eventName: string,
        payload?: Record<string, unknown>,
        timeoutMs: number = 10000,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.transport.socket.connected) {
                reject(new Error("Socket is not connected"));
                return;
            }

            const timeoutId = window.setTimeout(() => {
                reject(new Error(`${eventName} timed out`));
            }, timeoutMs);

            const onResponse = (response: AckResponse<T>) => {
                window.clearTimeout(timeoutId);

                if (!response || typeof response !== "object") {
                    reject(new Error(`Invalid response for ${eventName}`));
                    return;
                }

                if (response.ok) {
                    resolve(response.data);
                    return;
                }

                reject(new Error(response.error || `Failed: ${eventName}`));
            };

            if (payload === undefined) {
                this.transport.socket.emit(eventName, onResponse);
                return;
            }

            this.transport.socket.emit(eventName, payload, onResponse);
        });
    }

    setupRealtimeHandlers(handlers: RealtimeHandlers) {
        if (this.teardownRealtimeHandlers) {
            this.teardownRealtimeHandlers();
        }

        const onMessageNew = (payload: { message: ChatV2Message }) => {
            if (payload?.message) {
                handlers.onMessageNew(payload.message);
            }
        };

        const onMessageUpdate = (payload: { message: ChatV2Message }) => {
            if (payload?.message) {
                handlers.onMessageUpdate(payload.message);
            }
        };

        const onMessageDelete = (payload: {
            roomId: string;
            messageId: string;
            deletedAt: string | Date | null;
        }) => {
            if (payload?.roomId && payload?.messageId) {
                handlers.onMessageDelete(payload);
            }
        };

        this.transport.socket.on("chat:v2:message:new", onMessageNew);
        this.transport.socket.on("chat:v2:message:update", onMessageUpdate);
        this.transport.socket.on("chat:v2:message:delete", onMessageDelete);

        this.teardownRealtimeHandlers = () => {
            this.transport.socket.off("chat:v2:message:new", onMessageNew);
            this.transport.socket.off("chat:v2:message:update", onMessageUpdate);
            this.transport.socket.off("chat:v2:message:delete", onMessageDelete);
            this.teardownRealtimeHandlers = null;
        };

        return this.teardownRealtimeHandlers;
    }

    async listRooms(): Promise<ChatV2Room[]> {
        const response = await this.emitWithAck<{ rooms: ChatV2Room[] }>(
            "chat:v2:room:list",
        );
        return response.rooms;
    }

    async listCategories(workspaceId?: string): Promise<ChatV2RoomCategory[]> {
        const payload = workspaceId ? { workspaceId } : {};
        const response = await this.emitWithAck<{
            categories: ChatV2RoomCategory[];
        }>("chat:v2:category:list", payload);
        return response.categories;
    }

    async joinRoom(roomId: string): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:join",
            { roomId },
        );
        return response.room;
    }

    async listMessages(roomId: string, limit: number = 100): Promise<ChatV2Message[]> {
        const response = await this.emitWithAck<{ messages: ChatV2Message[] }>(
            "chat:v2:message:list",
            { roomId, limit },
        );
        return response.messages;
    }

    async createMessage(
        roomId: string,
        content: string,
        attachments?: ChatV2CreateAttachment[],
    ): Promise<ChatV2Message> {
        const clientMessageId =
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const payload: {
            roomId: string;
            clientMessageId: string;
            content: string;
            messageType?: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
            attachments?: ChatV2CreateAttachment[];
        } = {
            roomId,
            clientMessageId,
            content,
        };
        if (attachments?.length) {
            payload.attachments = attachments;
        } else {
            const standaloneGifUrl = getStandaloneGifUrl(content);
            if (standaloneGifUrl) {
                payload.content = standaloneGifUrl;
                payload.messageType = "IMAGE";
            }
        }

        const response = await this.emitWithAck<{
            message: ChatV2Message;
            deduplicated: boolean;
        }>("chat:v2:message:create", payload);

        return response.message;
    }

    async createRoom(input: {
        name: string;
        topic?: string;
        categoryId?: string | null;
        visibility?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    }): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{ room: ChatV2Room }>(
            "chat:v2:room:create",
            input,
        );
        return response.room;
    }

    async createCategory(
        name: string,
        workspaceId?: string,
    ): Promise<ChatV2RoomCategory> {
        const payload = workspaceId ? { name, workspaceId } : { name };
        const response = await this.emitWithAck<{
            category: ChatV2RoomCategory;
        }>("chat:v2:category:create", payload);
        return response.category;
    }

    async arrangeCategory(
        categoryId: string,
        position: number,
    ): Promise<ChatV2RoomCategory> {
        const response = await this.emitWithAck<{
            category: ChatV2RoomCategory;
        }>("chat:v2:category:arrange", { categoryId, position });
        return response.category;
    }

    async arrangeRoom(
        roomId: string,
        categoryId: string | null,
        position: number,
    ): Promise<ChatV2Room> {
        const response = await this.emitWithAck<{
            room: ChatV2Room;
        }>("chat:v2:room:arrange", {
            roomId,
            categoryId,
            position,
        });
        return response.room;
    }

    async listRoomMembers(roomId: string): Promise<ChatV2RoomMember[]> {
        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:list",
            { roomId },
        );
        return response.members;
    }

    async addRoomMember(
        roomId: string,
        userId: number,
        role?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY",
    ): Promise<ChatV2RoomMember[]> {
        const payload: {
            roomId: string;
            userId: number;
            role?: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | "READ_ONLY";
        } = {
            roomId,
            userId,
        };
        if (role) payload.role = role;

        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:add",
            payload,
        );
        return response.members;
    }

    async removeRoomMember(
        roomId: string,
        userId: number,
    ): Promise<ChatV2RoomMember[]> {
        const response = await this.emitWithAck<{ members: ChatV2RoomMember[] }>(
            "chat:v2:room:member:remove",
            { roomId, userId },
        );
        return response.members;
    }
}
