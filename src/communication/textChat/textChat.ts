import useUserStore from "@/common/store/useStore";
import { fetchLinkMetadata } from "@/common/utils/linkMetadata";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import { TextEvents } from "./_enums";
import type { Message, LinkMetadata } from "./_types";
import { v4 as uuidv4 } from "uuid";
import useMessagingStore from "@/common/store/messagingStore";
import {
    getSignedAttachmentUrl,
    initChatUpload,
    uploadFileToSignedUrl,
} from "@/communication/chatV2/uploadService";
import { LEGACY_MAINMAP_ROOM_ID } from "@/communication/chatV2/constants";

export class TextChatService {
    public static instance: TextChatService;
    sfuService: MediaTransportService;
    messages: Message[] = [];

    uiUpdater: ((newMessage: Message) => void) | null = null;

    private messageTimeouts = new Map<string, NodeJS.Timeout>();
    private readonly MESSAGE_TIMEOUT_MS = 15000;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
        this.setupDisconnectHandler();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new TextChatService();
        }
        return this.instance;
    }

    async sendMessage(message: string) {
        const clientId = uuidv4();
        const linkMetadata = await fetchLinkMetadata(message);

        const messageData = {
            clientId,
            name: useUserStore.getState().user.name,
            content: message,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            createdAt: new Date(),
            linkMetadata: linkMetadata.length > 0 ? linkMetadata : undefined,
            status: "pending" as const,
            isOptimistic: true,
        };

        useMessagingStore.getState().addOptimisticMessage(messageData);

        this.pendingMetadata.set(message, linkMetadata);

        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, messageData);

        this.startMessageTimeout(clientId);
    }

    private pendingMetadata = new Map<string, LinkMetadata[]>();

    private startMessageTimeout(clientId: string) {
        if (this.messageTimeouts.has(clientId)) {
            clearTimeout(this.messageTimeouts.get(clientId)!);
        }

        const timeout = setTimeout(() => {
            useMessagingStore
                .getState()
                .updateMessageStatus(clientId, "failed");
            this.messageTimeouts.delete(clientId);
        }, this.MESSAGE_TIMEOUT_MS);

        this.messageTimeouts.set(clientId, timeout);
    }

    setupMessageListener() {
        this.sfuService.socket.on(TextEvents.NEW_MESSAGE, async (incomingData: Message) => {
            let data = incomingData;

            if (
                data.type === "image"
                && typeof data.imageUrl === "string"
                && data.imageUrl.startsWith("chat/")
            ) {
                try {
                    const signedUrl = await getSignedAttachmentUrl({
                        roomId: LEGACY_MAINMAP_ROOM_ID,
                        objectKey: data.imageUrl,
                    });
                    data = {
                        ...data,
                        imageUrl: signedUrl,
                    };
                } catch (error) {
                    console.error("Failed to resolve signed image URL:", error);
                }
            }

            if (!data.linkMetadata && this.pendingMetadata.has(data.content)) {
                const metadata = this.pendingMetadata.get(data.content);
                if (metadata && metadata.length > 0) {
                    data.linkMetadata = metadata;
                }
                this.pendingMetadata.delete(data.content);
            }

            if (data.clientId && this.messageTimeouts.has(data.clientId)) {
                clearTimeout(this.messageTimeouts.get(data.clientId)!);
                this.messageTimeouts.delete(data.clientId);

                useMessagingStore
                    .getState()
                    .updateMessageStatus(data.clientId, "sent", data);
            } else {
                this.messages.push(data);
                useMessagingStore.getState().addMessage(data);
            }

            this.uiUpdater?.(data);
        });
    }

    private setupDisconnectHandler() {
        this.sfuService.socket.on("disconnect", () => {
            this.messageTimeouts.forEach((timeout, clientId) => {
                clearTimeout(timeout);
                useMessagingStore
                    .getState()
                    .updateMessageStatus(clientId, "failed");
            });
            this.messageTimeouts.clear();
        });
    }

    retryMessage(clientId: string) {
        const message = useMessagingStore.getState().retryMessage(clientId);
        if (!message) return;

        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, message);

        this.startMessageTimeout(clientId);
    }

    sendGif(gifUrl: string) {
        const clientId = uuidv4();

        const messageData = {
            clientId,
            createdAt: new Date(),
            name: useUserStore.getState().user.name,
            content: "",
            type: "gif" as const,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            gifUrl: gifUrl,
            status: "pending" as const,
            isOptimistic: true,
        };

        useMessagingStore.getState().addOptimisticMessage(messageData);

        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, messageData);

        this.startMessageTimeout(clientId);
    }

    async sendImage(file: File) {
        const clientId = uuidv4();
        const localPreviewUrl = URL.createObjectURL(file);

        const messageData = {
            clientId,
            createdAt: new Date(),
            name: useUserStore.getState().user.name,
            content: "",
            type: "image" as const,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            imageUrl: localPreviewUrl,
            status: "pending" as const,
            isOptimistic: true,
        };

        useMessagingStore.getState().addOptimisticMessage(messageData);

        try {
            const uploadInit = await initChatUpload({
                roomId: LEGACY_MAINMAP_ROOM_ID,
                file,
            });
            await uploadFileToSignedUrl(file, uploadInit);

            this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, {
                ...messageData,
                imageUrl: uploadInit.attachment.objectKey,
            });

            this.startMessageTimeout(clientId);
        } catch (error) {
            console.error("Failed to upload image:", error);
            useMessagingStore.getState().updateMessageStatus(clientId, "failed");
        }
    }
}
