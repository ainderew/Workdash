import { AudioChat } from "@/communication/audioChat/audioChat";
import { useEffect, useState } from "react";

export default function AudioElement() {
    const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
    const [, setUpdateTrigger] = useState(0);

    useEffect(() => {
        const audioChatService = AudioChat.getInstance();
        audioChatService.initializeAudioChat(
            (audioElement: HTMLAudioElement) =>
                setAudioElements((prev) => [audioElement, ...prev]),
            () => setUpdateTrigger((prev) => prev + 1),
        );
        
        
        

        return () => {
            audioChatService.cleanup();
        };
    }, []);

    useEffect(() => {
        // Chrome requires a muted <audio> element playing the stream to keep
        // createMediaStreamSource() active. Without this, WebRTC tracks go silent.
        for (const audioEl of audioElements) {
            if (!audioEl) continue;
            audioEl.play().catch(console.error);
        }
    }, [audioElements]);

    return null;
}
