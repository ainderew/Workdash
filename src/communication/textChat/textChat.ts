import useUserStore from "@/common/store/useStore";
import { fetchLinkMetadata } from "@/common/utils/linkMetadata";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import { TextEvents } from "./_enums";
import type { Message, LinkMetadata } from "./_types";

export class TextChatService {
    public static instance: TextChatService;
    sfuService: MediaTransportService;
    messages: Message[] = [];

    uiUpdater: ((newMessage: Message) => void) | null = null;

    constructor() {
        this.sfuService = MediaTransportService.getInstance();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new TextChatService();
        }
        return this.instance;
    }

    async sendMessage(message: string) {
        // Fetch metadata for any links in the message
        const linkMetadata = await fetchLinkMetadata(message);

        const messageData = {
            name: useUserStore.getState().user.name,
            content: message,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            createdAt: new Date(),
            linkMetadata: linkMetadata.length > 0 ? linkMetadata : undefined,
        };

        console.log('📤 Sending message with metadata:', messageData);

        // Store metadata locally in a map for when message comes back from server
        this.pendingMetadata.set(message, linkMetadata);

        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, messageData);
    }

    private pendingMetadata = new Map<string, LinkMetadata[]>();

    setupMessageListener() {
        this.sfuService.socket.on(TextEvents.NEW_MESSAGE, (data: Message) => {
            console.log('📥 Received message from server:', data);
            console.log('📊 Has linkMetadata?', !!data.linkMetadata, data.linkMetadata);

            // If metadata was stripped by backend, restore it from pending metadata
            if (!data.linkMetadata && this.pendingMetadata.has(data.content)) {
                const metadata = this.pendingMetadata.get(data.content);
                if (metadata && metadata.length > 0) {
                    data.linkMetadata = metadata;
                    console.log('✨ Restored metadata from pending:', metadata);
                }
                this.pendingMetadata.delete(data.content);
            }

            this.messages.push(data);
            this.uiUpdater?.(data);
        });
    }

    sendGif(gifUrl: string) {
        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, {
            createdAt: new Date(),
            name: useUserStore.getState().user.name,
            content: "",
            type: "gif",
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            gifUrl: gifUrl,
        });
    }

    sendImage(imageUrl: string) {
        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, {
            createdAt: new Date(),
            name: useUserStore.getState().user.name,
            content: "",
            type: "image",
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            imageUrl: imageUrl,
        });
    }
}
