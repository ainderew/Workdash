import React, { useState } from "react";
import usePlayersStore from "@/common/store/playerStore";
import MemberItem from "./MemberItem";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SidebarMenu from "../SidebarMenu/SidebarMenu";
import SidebarHeader from "../SidebarMenu/SidebarHeader";

interface MembersUiProps {
    isMembersUiOpen: boolean;
    onClose: () => void;
}

function MembersUi({ isMembersUiOpen, onClose }: MembersUiProps) {
    const players = usePlayersStore((state) => state.playerMap);
    const [searchQuery, setSearchQuery] = useState("");

    if (!isMembersUiOpen) {
        return null;
    }

    const filteredPlayers = Object.values(players).filter((player) =>
        player.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <SidebarMenu isOpen={isMembersUiOpen}>
            <div
                className={`text-white h-[calc(100vh-var(--ui-controls-height)+5px)] w-100 bg-primary backdrop-blur-sm absolute right-0 top-0 border-l border-neutral-700 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl`}
            >
                <div className="flex items-center justify-between p-4 border-b border-neutral-700">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg">
                            Theoria Medical
                        </span>
                        <span className="text-xs text-neutral-400">
                            {filteredPlayers.length} member
                            {filteredPlayers.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                            id="chat-input"
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Escape") {
                                    onClose();
                                }
                            }}
                            placeholder="Search members"
                            className="pl-10 bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white placeholder:text-neutral-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex flex-col gap-2">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((player) => (
                                <MemberItem key={player.id} player={player} />
                            ))
                        ) : (
                            <div className="text-center text-neutral-500 py-8">
                                No members found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SidebarMenu>
    );
}

export default MembersUi;
