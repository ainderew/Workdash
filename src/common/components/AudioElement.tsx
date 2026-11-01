import { AudioChat } from "@/communication/audioChat/audioChat";
import { useWorldVoice } from "@/common/hooks/useWorldVoice";
import { useEffect } from "react";

export default function AudioElement() {
    useWorldVoice();
    useEffect(() => {
        const audio = AudioChat.getInstance();
        // Keep only the live elements owned by AudioChat. Zone changes must not
        // accumulate detached elements in React state.
        audio.initializeAudioChat(element => { void audio.playAudioElement(element); });
        const enable = () => { void audio.resumeAudioContexts(); };
        window.addEventListener("workdash:enable-audio", enable);
        return () => { window.removeEventListener("workdash:enable-audio", enable); void audio.cleanup(); };
    }, []);
    return null;
}
