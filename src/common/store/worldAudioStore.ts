import { create } from "zustand";

// Presentation state from server zone events. This does not authorize audio.
export const audioAreaNames: Record<string, string> = {
    main_office: "Main office",
    private_office: "Side office",
    outdoor_park_1: "Fountain park",
    sports_corner: "Sports corner",
    pond_garden: "Pond garden",
    cafe_square: "Café square",
    campfire: "Campfire",
    outdoors: "Outdoor paths",
    soccer_field: "Soccer field",
};
export const audioAreaName = (id: string) => audioAreaNames[id] ?? "Audio area";

interface WorldAudioState {
    connected: boolean;
    zoneId: string | null;
    peerIds: string[];
    showAreas: boolean;
    helpOpen: boolean;
    setZone: (zoneId: string | null, peerIds: string[]) => void;
    addPeer: (zoneId: string, id: string) => void;
    removePeer: (zoneId: string, id: string) => void;
    setShowAreas: (show: boolean) => void;
    setHelpOpen: (open: boolean) => void;
    resetConnection: () => void;
}

const useWorldAudioStore = create<WorldAudioState>((set) => ({
    connected: false, zoneId: null, peerIds: [], showAreas: false, helpOpen: false,
    setZone: (zoneId, peerIds) => set({ connected: true, zoneId, peerIds: [...new Set(peerIds)] }),
    addPeer: (zoneId, id) => set(state => state.zoneId === zoneId ? { peerIds: [...new Set([...state.peerIds, id])] } : {}),
    removePeer: (zoneId, id) => set(state => state.zoneId === zoneId ? { peerIds: state.peerIds.filter(peer => peer !== id) } : {}),
    setShowAreas: (showAreas) => set({ showAreas }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),
    resetConnection: () => set({ connected: false, zoneId: null, peerIds: [] }),
}));

export default useWorldAudioStore;
