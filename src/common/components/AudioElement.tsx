import { AudioChat } from "@/communication/audioChat/audioChat";
import { useEffect, useState } from "react";

export default function AudioElement() {
    const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);

    useEffect(() => {
        const audioChatService = AudioChat.getInstance();
        audioChatService.initializeAudioChat((audioElement: HTMLAudioElement) =>
            setAudioElements((prev) => [audioElement, ...prev]),
        );
        audioChatService.joinVoiceChat();
        audioChatService.watchNewProducers();
    }, []);

    useEffect(() => {
        for (const audioEl of audioElements) {
            if (!audioEl) continue;
            audioEl.muted = false;
            audioEl.play().catch(console.error);
        }
    }, [audioElements]);

    return null;
}
