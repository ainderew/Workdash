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
        // Audio playback is handled by the Web Audio pipeline in AudioChat.
        // The audio elements are bookkeeping references only — do NOT call play()
        // as that would create a duplicate playback path causing echo/flanging.
    }, [audioElements]);

    return null;
}
