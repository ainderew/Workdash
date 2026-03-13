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
        audioChatService.joinVoiceChat().catch((err) => {
            console.error("Failed to join voice chat:", err);
        });
        
        
        

        return () => {
            audioChatService.cleanup();
        };
    }, []);

    useEffect(() => {
        
        
        
        for (const audioEl of audioElements) {
            if (!audioEl) continue;
            audioEl.muted = true;
            audioEl.play().catch(console.error);
        }
    }, [audioElements]);

    return null;
}
