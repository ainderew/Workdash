import useUserStore from "@/common/store/useStore";
import { MediaTransportService } from "../mediaTransportService/mediaTransportServive";
import { TextEvents } from "./_enums";
import { Message } from "./_types";

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

    sendMessage(message: string) {
        this.sfuService.socket.emit(TextEvents.SEND_MESSAGE, {
            name: useUserStore.getState().user.name,
            content: message,
            senderSocketId: this.sfuService.socket.id,
            senderSpriteSheet: useUserStore.getState().user.spriteSheetDataUrl,
            createdAt: new Date(),
        });
    }

    setupMessageListener() {
        this.sfuService.socket.on(TextEvents.NEW_MESSAGE, (data: Message) => {
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
