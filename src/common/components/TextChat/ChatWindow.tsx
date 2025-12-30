import React, { useEffect, useMemo, useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TextChatService } from "@/communication/textChat/textChat";
import MessageItem from "./MessageItem";
import GiphyPicker from "./GiphyPicker";
import { Send, Smile, Image as ImageIcon, Bell, BellOff } from "lucide-react";
import SidebarMenu from "../SidebarMenu/SidebarMenu";
import SidebarHeader from "../SidebarMenu/SidebarHeader";
import useMessagingStore, {
    type MessagingState,
} from "@/common/store/messagingStore";
import { Message } from "@/communication/textChat/_types";

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
}

function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
    const [message, setMessage] = useState("");
    const [showGiphyPicker, setShowGiphyPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messages = useMessagingStore(
        (state: MessagingState) => state.messages,
    );
    const markAsRead = useMessagingStore(
        (state: MessagingState) => state.markAsRead,
    );
    const setCurrentUserSocketId = useMessagingStore(
        (state: MessagingState) => state.setCurrentUserSocketId,
    );
    const notificationsMuted = useMessagingStore(
        (state: MessagingState) => state.notificationsMuted,
    );
    const toggleNotifications = useMessagingStore(
        (state: MessagingState) => state.toggleNotifications,
    );

    const textChatService = useMemo(() => {
        return TextChatService.getInstance();
    }, []);

    useEffect(() => {
        if (textChatService.sfuService?.socket?.id) {
            setCurrentUserSocketId(textChatService.sfuService.socket.id);
        }
    }, [textChatService, setCurrentUserSocketId]);

    useEffect(() => {
        if (!isOpen) return;
        markAsRead();
        const chatInput = document.getElementById("chat-input");
        if (chatInput) {
            chatInput.focus();
        }
    }, [isOpen, markAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function sendMessage() {
        if (!message.trim()) return;

        await textChatService.sendMessage(message);
        setMessage("");
    }

    function sendGif(gifUrl: string) {
        textChatService.sendGif(gifUrl);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        /**
         * Max file size 5MB
         */
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size must be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            textChatService.sendImage(imageUrl);
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const shouldShowAvatar = (index: number) => {
        if (index === 0) return true;

        const currentMsg = messages[index];
        const prevMsg = messages[index - 1];

        if (currentMsg.senderSocketId !== prevMsg.senderSocketId) return true;

        const currentTime = new Date(currentMsg.createdAt).getTime();
        const prevTime = new Date(prevMsg.createdAt).getTime();
        const timeDiff = currentTime - prevTime;

        return timeDiff > 5 * 60 * 1000;
    };

    return (
        <SidebarMenu isOpen={isOpen}>
            <SidebarHeader title="Team Chat" onClose={onClose}>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400">
                        {messages.length} message
                        {messages.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                        onClick={toggleNotifications}
                        variant="ghost"
                        size="icon-sm"
                        className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                        title={
                            notificationsMuted
                                ? "Unmute notifications"
                                : "Mute notifications"
                        }
                    >
                        {notificationsMuted ? (
                            <BellOff className="h-4 w-4" />
                        ) : (
                            <Bell className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </SidebarHeader>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 z-100">
                <div className="flex flex-col">
                    {messages.length > 0 ? (
                        messages.map((msg: Message, index: number) => (
                            <MessageItem
                                key={`${msg.senderSocketId}-${msg.createdAt}-${index}`}
                                message={msg}
                                showAvatar={shouldShowAvatar(index)}
                            />
                        ))
                    ) : (
                        <div className="text-center text-neutral-500 py-8">
                            No messages yet. Start the conversation!
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 border-t border-neutral-700 relative">
                {showGiphyPicker && (
                    <GiphyPicker
                        onSelectGif={sendGif}
                        onClose={() => setShowGiphyPicker(false)}
                    />
                )}

                <div className="flex gap-2 items-end">
                    <Textarea
                        id="chat-input"
                        autoFocus
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            } else if (e.key === "Escape") {
                                onClose();
                            }
                        }}
                        placeholder="Message the team"
                        rows={1}
                        className="relative pb-10 flex-1 bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white placeholder:text-neutral-500 resize-none"
                    />
                    <div className="absolute bottom-5 left-6 flex gap-1">
                        <Button
                            onClick={() => setShowGiphyPicker(!showGiphyPicker)}
                            variant="ghost"
                            size="icon-sm"
                            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                            title="Send GIF"
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="ghost"
                            size="icon-sm"
                            className="text-neutral-400 hover:text-white hover:bg-neutral-800"
                            title="Upload Image"
                        >
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Send Button */}
                    <Button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        size="icon"
                        className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </SidebarMenu>
    );
}

export default ChatWindow;
