import React, { useEffect, useId, useRef, useState } from "react";
import { AudioLines, HelpCircle, Map, Mic, MicOff, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import useWorldAudioStore, { audioAreaName } from "@/common/store/worldAudioStore";
import useUiStore from "@/common/store/uiStore";
import useCallStore from "@/common/store/callStore";
import useFocusStore from "@/common/store/focusStore";
import styles from "./AudioAreaIndicator.module.css";

export const AUDIO_AREA_HELP_KEY = "workdash:audio-area-help:v1";

export default function AudioAreaIndicator() {
    const { connected, playbackBlocked, zoneId, peerIds, showAreas, setShowAreas, helpOpen: open, setHelpOpen: setOpen } = useWorldAudioStore();
    const muted = useUiStore(state => state.isMuted);
    const inCall = useCallStore(state => !!state.currentCall || !!state.callOwnershipStatus);
    const focus = useFocusStore(state => state.localFocusMode);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const checked = useRef(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const paused = inCall || focus;

    useEffect(() => {
        if (!connected || !zoneId || paused || checked.current) return;
        checked.current = true;
        let seen = false;
        try { seen = localStorage.getItem(AUDIO_AREA_HELP_KEY) === "seen"; } catch { /* Private browsing can deny storage. */ }
        if (!seen) { setOpen(true); setShowAreas(true); }
    }, [connected, zoneId, paused, setShowAreas, setOpen]);
    useEffect(() => () => { setShowAreas(false); setOpen(false); }, [setShowAreas, setOpen]);

    const dismiss = () => {
        setOpen(false);
        setShowAreas(false);
        try { localStorage.setItem(AUDIO_AREA_HELP_KEY, "seen"); } catch { /* Help still works without persistence. */ }
        if (panel.current?.contains(document.activeElement)) trigger.current?.focus();
    };
    useEffect(() => {
        if (!open) return;
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
        window.addEventListener("keydown", escape);
        return () => window.removeEventListener("keydown", escape);
    }, [open]);

    const name = !connected ? "Connecting audio…" : zoneId ? audioAreaName(zoneId) : "Outside an audio area";
    const peers = peerIds.length === 0 ? "Just you here" : `${peerIds.length} ${peerIds.length === 1 ? "other" : "others"} here`;
    const detail = paused ? (inCall ? "In a call · World audio paused" : "Focus mode · World audio paused")
        : !connected ? "Waiting for your audio area" : !zoneId ? "No shared audio here" : `${muted ? "Mic off" : "Mic on"} · ${peers}`;

    return <aside className={styles.root} aria-label="Audio area">
        {playbackBlocked && !paused && <div className={styles.playback}>
            <p>Your browser has paused sound. Enable it to hear people here.</p>
            <button type="button" className={styles.done} onClick={() => window.dispatchEvent(new Event("workdash:enable-audio"))}>Enable audio</button>
        </div>}
        {open && <div ref={panel} id={panelId} className={styles.help} role="region" aria-label="How audio areas work">
            <div className={styles.heading}>
                <h2>Talk in the same area</h2>
                <button type="button" aria-label="Dismiss audio help" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
            </div>
            <p>Walk into the same audio area as your friends to hear each other. Turn on your mic using the microphone button below to talk.</p>
            <p>Crossing an outline changes your conversation. Paths and grass between the outlined areas share outdoor audio.</p>
            <button type="button" className={styles.mapToggle} aria-pressed={showAreas} onClick={() => setShowAreas(!showAreas)}>
                <Map size={18} aria-hidden="true" /> {showAreas ? "Hide audio areas" : "Show audio areas"}
            </button>
            <div className={styles.footer}><span>Reopen this help from your area label.</span><button type="button" className={styles.done} onClick={dismiss}>Got it</button></div>
        </div>}
        <Tooltip open={!open && tooltipOpen} onOpenChange={setTooltipOpen} delayDuration={300}>
            <TooltipTrigger asChild>
                <button ref={trigger} type="button" className={styles.indicator} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-label={`${name}. ${detail}. Audio area help`} onClick={() => open ? dismiss() : setOpen(true)}>
                    <AudioLines className={styles.areaIcon} size={21} aria-hidden="true" />
                    <span className={styles.copy}><strong>{name}</strong><span>{muted || paused || !connected ? <MicOff size={12} aria-hidden="true" /> : <Mic size={12} aria-hidden="true" />}{detail}</span></span>
                    <HelpCircle size={16} aria-hidden="true" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>Your mic reaches people in the same audio area. Open for help.</TooltipContent>
        </Tooltip>
        <span className={styles.srOnly} role="status" aria-live="polite">{name}. {detail}.</span>
    </aside>;
}
