import { AudioChat } from "@/communication/audioChat/audioChat";
import { useEffect, useState } from "react";

export default function AudioElement() {
    const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
    const [, setUpdateTrigger] = useState(0);

    useEffect(() => {
        const audioChatService = AudioChat.getInstance();

        // Initialize with both setter and update callback
        audioChatService.initializeAudioChat(
            (audioElement: HTMLAudioElement) =>
                setAudioElements((prev) => [audioElement, ...prev]),
            () => setUpdateTrigger(prev => prev + 1)
        );

        // Join voice chat first
        audioChatService.joinVoiceChat();

        // Load existing producers, then watch for new ones
        audioChatService.loadExistingProducers().then(() => {
            audioChatService.watchNewProducers();
        });

        return () => {
            audioChatService.cleanup();
        };
    }, []);

    useEffect(() => {
        // Note: Audio playback is now handled by Web Audio API (GainNode)
        // We don't need to play HTMLAudioElements anymore
        // Just play them muted to keep the stream active
        for (const audioEl of audioElements) {
            if (!audioEl) continue;
            audioEl.muted = true; // Keep muted - Web Audio pipeline controls volume
            audioEl.play().catch(console.error);
        }
    }, [audioElements]);

    return null;
}
