import { create } from "zustand";

interface UiState {
    // Panel states
    isChatWindowOpen: boolean;
    isMembersUiOpen: boolean;
    isCalendarUiOpen: boolean;

    // Current scene
    currentScene: string | null;

    // Command palette
    isCommandPaletteOpen: boolean;
    currentCommandForm: string | null;

    // Character customization
    isCharacterCustomizationOpen: boolean;
    characterCustomizationMode: "selection" | "name" | "character" | null;

    // Audio controls
    isMuted: boolean;
    availableMicrophones: MediaDeviceInfo[];
    selectedMicrophoneId: string;
    isMicSelectorOpen: boolean;

    // Video controls
    isVideoOff: boolean;

    // Soccer stats modal
    isSoccerStatsModalOpen: boolean;

    // Actions for panels
    toggleChatWindow: () => void;
    toggleMembersUi: () => void;
    toggleCalendarMenu: () => void;
    closeAllPanels: () => void;

    // Actions for scene
    setCurrentScene: (scene: string) => void;

    // Actions for command palette
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    setCommandForm: (formType: string | null) => void;

    // Actions for character customization
    openCharacterCustomization: (mode?: "selection" | "name" | "character") => void;
    closeCharacterCustomization: () => void;
    setCharacterCustomizationMode: (mode: "selection" | "name" | "character" | null) => void;

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

    // Actions for soccer stats modal
    openSoccerStatsModal: () => void;
    closeSoccerStatsModal: () => void;
}

const useUiStore = create<UiState>((set) => ({
    // Initial states
    isChatWindowOpen: false,
    isMembersUiOpen: false,
    isCalendarUiOpen: false,
    currentScene: null,
    isCommandPaletteOpen: false,
    currentCommandForm: null,
    isCharacterCustomizationOpen: false,
    characterCustomizationMode: null,
    isMuted: false,
    availableMicrophones: [],
    selectedMicrophoneId: "",
    isMicSelectorOpen: false,
    isVideoOff: true,
    isSoccerStatsModalOpen: false,

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

    // Scene actions
    setCurrentScene: (scene) => set({ currentScene: scene }),

    // Command palette actions
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () =>
        set({
            isCommandPaletteOpen: false,
            currentCommandForm: null,
        }),
    setCommandForm: (formType) => set({ currentCommandForm: formType }),

    // Character customization actions
    openCharacterCustomization: (mode = "character") =>
        set({
            isCharacterCustomizationOpen: true,
            characterCustomizationMode: mode,
        }),
    closeCharacterCustomization: () =>
        set({
            isCharacterCustomizationOpen: false,
            characterCustomizationMode: null,
        }),
    setCharacterCustomizationMode: (mode) =>
        set({ characterCustomizationMode: mode }),

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

    // Soccer stats modal actions
    openSoccerStatsModal: () => set({ isSoccerStatsModalOpen: true }),
    closeSoccerStatsModal: () => set({ isSoccerStatsModalOpen: false }),
}));

export default useUiStore;
