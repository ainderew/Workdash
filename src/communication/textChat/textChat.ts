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
        const linkMetadata = await fetchLinkMetadata(message);

        const messageData = {
            name: useUserStore.getState().user.name,
            content: message,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            createdAt: new Date(),
            linkMetadata: linkMetadata.length > 0 ? linkMetadata : undefined,
        };

        this.pendingMetadata.set(message, linkMetadata);

        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, messageData);
    }

    private pendingMetadata = new Map<string, LinkMetadata[]>();

    setupMessageListener() {
        this.sfuService.socket.on(TextEvents.NEW_MESSAGE, (data: Message) => {
            if (!data.linkMetadata && this.pendingMetadata.has(data.content)) {
                const metadata = this.pendingMetadata.get(data.content);
                if (metadata && metadata.length > 0) {
                    data.linkMetadata = metadata;
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
