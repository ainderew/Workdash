import { create } from "zustand";

interface SoccerState {
    isGameActive: boolean;
    isSelectionPhaseActive: boolean;
    selectionOrder: string[];
    currentPickerId: string | null;
    availableSkillIds: string[];
    selectionTurnEndTime: number;
    playerPicks: Record<string, string>; // playerId -> skillId
    
    setGameActive: (active: boolean) => void;
    setSelectionPhaseActive: (active: boolean) => void;
    setSelectionOrder: (order: string[]) => void;
    setCurrentPickerId: (id: string | null) => void;
    setAvailableSkillIds: (skillIds: string[]) => void;
    setSelectionTurnEndTime: (endTime: number) => void;
    setPlayerPick: (playerId: string, skillId: string) => void;
    resetSelection: () => void;
}

const useSoccerStore = create<SoccerState>((set) => ({
    isGameActive: false,
    isSelectionPhaseActive: false,
    selectionOrder: [],
    currentPickerId: null,
    availableSkillIds: [],
    selectionTurnEndTime: 0,
    playerPicks: {},

    setGameActive: (active) => set({ isGameActive: active }),
    setSelectionPhaseActive: (active) => set({ isSelectionPhaseActive: active }),
    setSelectionOrder: (order) => set({ selectionOrder: order }),
    setCurrentPickerId: (id) => set({ currentPickerId: id }),
    setAvailableSkillIds: (skillIds) => set({ availableSkillIds: skillIds }),
    setSelectionTurnEndTime: (endTime) => set({ selectionTurnEndTime: endTime }),
    setPlayerPick: (playerId, skillId) => 
        set((state) => ({ 
            playerPicks: { ...state.playerPicks, [playerId]: skillId },
            availableSkillIds: state.availableSkillIds.filter(id => id !== skillId)
        })),
    resetSelection: () => set({
        isSelectionPhaseActive: false,
        selectionOrder: [],
        currentPickerId: null,
        availableSkillIds: [],
        selectionTurnEndTime: 0,
        playerPicks: {},
    }),
}));

export default useSoccerStore;
