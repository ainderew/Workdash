import { create } from "zustand";
import useWorkspaceStore from "./workspaceStore";

export type InteractionMode = "world" | "desk";

interface UiState {
    
    isChatWindowOpen: boolean;
    isMembersUiOpen: boolean;
    isCalendarUiOpen: boolean;

    
    currentScene: string | null;

    
    isCommandPaletteOpen: boolean;
    currentCommandForm: string | null;

    
    isCharacterCustomizationOpen: boolean;
    characterCustomizationMode: "selection" | "name" | "character" | null;

    
    isMuted: boolean;
    availableMicrophones: MediaDeviceInfo[];
    selectedMicrophoneId: string;
    isMicSelectorOpen: boolean;


    isVideoOff: boolean;
    availableCameras: MediaDeviceInfo[];
    selectedCameraId: string;

    
    isSoccerStatsModalOpen: boolean;

    
    isSoccerGameControlModalOpen: boolean;
    
    
    isMatchHistoryModalOpen: boolean;


    isSoccerEndgameVisible: boolean;

    isAchievementsModalOpen: boolean;

    
    ping: number | null;
    setPing: (ping: number | null) => void;
    interactionMode: InteractionMode;
    setInteractionMode: (mode: InteractionMode) => void;
    toggleInteractionMode: () => void;

    showWorkspaceSelector: boolean;
    openWorkspaceSelector: () => void;
    closeWorkspaceSelector: () => void;

    
    toggleChatWindow: () => void;
    toggleMembersUi: () => void;
    toggleCalendarMenu: () => void;
    closeAllPanels: () => void;

    
    setCurrentScene: (scene: string) => void;

    
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    setCommandForm: (formType: string | null) => void;

    
    openCharacterCustomization: (mode?: "selection" | "name" | "character") => void;
    closeCharacterCustomization: () => void;
    setCharacterCustomizationMode: (mode: "selection" | "name" | "character" | null) => void;

    
    toggleMic: () => void;
    setIsMuted: (muted: boolean) => void;
    setAvailableMicrophones: (mics: MediaDeviceInfo[]) => void;
    setSelectedMicrophoneId: (id: string) => void;
    toggleMicSelector: () => void;
    closeMicSelector: () => void;


    toggleVideoCam: () => void;
    setIsVideoOff: (isOff: boolean) => void;
    setAvailableCameras: (cameras: MediaDeviceInfo[]) => void;
    setSelectedCameraId: (id: string) => void;

    
    openSoccerStatsModal: () => void;
    closeSoccerStatsModal: () => void;

    
    openSoccerGameControlModal: () => void;
    closeSoccerGameControlModal: () => void;

    
    openMatchHistoryModal: () => void;
    closeMatchHistoryModal: () => void;


    setIsSoccerEndgameVisible: (visible: boolean) => void;

    openAchievementsModal: () => void;
    closeAchievementsModal: () => void;

    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const useUiStore = create<UiState>((set) => ({
    
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
    availableCameras: [],
    selectedCameraId: "",
    isSoccerStatsModalOpen: false,
    isSoccerGameControlModalOpen: false,
    isMatchHistoryModalOpen: false,
    isSoccerEndgameVisible: false,
    isAchievementsModalOpen: false,
    ping: null,
    interactionMode: "world",
    showWorkspaceSelector: false,

    
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

    
    setCurrentScene: (scene) => set({ currentScene: scene }),

    
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () =>
        set({
            isCommandPaletteOpen: false,
            currentCommandForm: null,
        }),
    setCommandForm: (formType) => set({ currentCommandForm: formType }),

    
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

    
    toggleMic: () => set((state) => ({ isMuted: !state.isMuted })),
    setIsMuted: (muted) => set({ isMuted: muted }),
    setAvailableMicrophones: (mics) => set({ availableMicrophones: mics }),
    setSelectedMicrophoneId: (id) => set({ selectedMicrophoneId: id }),
    toggleMicSelector: () =>
        set((state) => ({ isMicSelectorOpen: !state.isMicSelectorOpen })),
    closeMicSelector: () => set({ isMicSelectorOpen: false }),


    toggleVideoCam: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
    setIsVideoOff: (isOff) => set({ isVideoOff: isOff }),
    setAvailableCameras: (cameras) => set({ availableCameras: cameras }),
    setSelectedCameraId: (id) => set({ selectedCameraId: id }),

    
    openSoccerStatsModal: () => set({ isSoccerStatsModalOpen: true }),
    closeSoccerStatsModal: () => set({ isSoccerStatsModalOpen: false }),

    
    openSoccerGameControlModal: () => set({ isSoccerGameControlModalOpen: true }),
    closeSoccerGameControlModal: () => set({ isSoccerGameControlModalOpen: false }),

    
    openMatchHistoryModal: () => set({ isMatchHistoryModalOpen: true }),
    closeMatchHistoryModal: () => set({ isMatchHistoryModalOpen: false }),


    setIsSoccerEndgameVisible: (visible: boolean) => set({ isSoccerEndgameVisible: visible }),

    openAchievementsModal: () => set({ isAchievementsModalOpen: true }),
    closeAchievementsModal: () => set({ isAchievementsModalOpen: false }),

    isSidebarCollapsed:
        typeof window !== "undefined" &&
        localStorage.getItem("wd-sidebar-collapsed") === "true",
    toggleSidebar: () =>
        set((state) => {
            const next = !state.isSidebarCollapsed;
            localStorage.setItem("wd-sidebar-collapsed", String(next));
            return { isSidebarCollapsed: next };
        }),
    setSidebarCollapsed: (collapsed) => {
        localStorage.setItem("wd-sidebar-collapsed", String(collapsed));
        set({ isSidebarCollapsed: collapsed });
    },

    setPing: (ping) => set({ ping }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),
    toggleInteractionMode: () =>
        set((state) => ({
            interactionMode: state.interactionMode === "world" ? "desk" : "world",
        })),

    openWorkspaceSelector: () => {
        const { workspaces, isLoading, fetchMyWorkspaces } =
            useWorkspaceStore.getState();
        if (workspaces.length === 0 && !isLoading) {
            void fetchMyWorkspaces();
        }
        set({ showWorkspaceSelector: true });
    },
    closeWorkspaceSelector: () => set({ showWorkspaceSelector: false }),
}));

export default useUiStore;
