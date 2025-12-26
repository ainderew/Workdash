export type Message = {
    content: string;
    senderSocketId: string;
    senderSpriteSheet: string | undefined;
    name: string;
    createdAt: Date;
    type?: "text" | "gif" | "image";
    gifUrl?: string;
    imageUrl?: string;
};
