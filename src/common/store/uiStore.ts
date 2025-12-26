import { create } from "zustand";

interface UiState {
    // Panel states
    isChatWindowOpen: boolean;
    isMembersUiOpen: boolean;
    isCalendarUiOpen: boolean;

    // Audio controls
    isMuted: boolean;
    availableMicrophones: MediaDeviceInfo[];
    selectedMicrophoneId: string;
    isMicSelectorOpen: boolean;

    // Video controls
    isVideoOff: boolean;

    // Actions for panels
    toggleChatWindow: () => void;
    toggleMembersUi: () => void;
    toggleCalendarMenu: () => void;
    closeAllPanels: () => void;

    // Actions for audio
    toggleMic: () => void;
    setIsMuted: (muted: boolean) => void;
    setAvailableMicrophones: (mics: MediaDeviceInfo[]) => void;
    setSelectedMicrophoneId: (id: string) => void;
    toggleMicSelector: () => void;
    closeMicSelector: () => void;

    // Actions for video
    toggleVideoCam: () => void;
    setIsVideoOff: (isOff: boolean) => void;
}

const useUiStore = create<UiState>((set) => ({
    // Initial states
    isChatWindowOpen: false,
    isMembersUiOpen: false,
    isCalendarUiOpen: false,
    isMuted: false,
    availableMicrophones: [],
    selectedMicrophoneId: "",
    isMicSelectorOpen: false,
    isVideoOff: true,

    // Panel actions
    toggleChatWindow: () =>
        set((state) => ({
            isChatWindowOpen: !state.isChatWindowOpen,
            isMembersUiOpen: false,
            isCalendarUiOpen: false,
        })),

    toggleMembersUi: () =>
        set((state) => ({
            isMembersUiOpen: !state.isMembersUiOpen,
            isChatWindowOpen: false,
            isCalendarUiOpen: false,
        })),

    toggleCalendarMenu: () =>
        set((state) => ({
            isCalendarUiOpen: !state.isCalendarUiOpen,
            isChatWindowOpen: false,
            isMembersUiOpen: false,
        })),

    closeAllPanels: () =>
        set({
            isChatWindowOpen: false,
            isMembersUiOpen: false,
            isCalendarUiOpen: false,
        }),

    // Audio actions
    toggleMic: () => set((state) => ({ isMuted: !state.isMuted })),
    setIsMuted: (muted) => set({ isMuted: muted }),
    setAvailableMicrophones: (mics) => set({ availableMicrophones: mics }),
    setSelectedMicrophoneId: (id) => set({ selectedMicrophoneId: id }),
    toggleMicSelector: () =>
        set((state) => ({ isMicSelectorOpen: !state.isMicSelectorOpen })),
    closeMicSelector: () => set({ isMicSelectorOpen: false }),

    // Video actions
    toggleVideoCam: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
    setIsVideoOff: (isOff) => set({ isVideoOff: isOff }),
}));

export default useUiStore;
