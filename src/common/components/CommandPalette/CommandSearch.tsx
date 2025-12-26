import React from "react";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import useUiStore from "@/common/store/uiStore";
import { searchCommands } from "./commandRegistry";
import { executeCommand } from "./commandExecutor";
import CommandList from "./CommandList";
import { Command } from "./types";

export default function CommandSearch() {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const closeCommandPalette = useUiStore(
        (state) => state.closeCommandPalette,
    );
    const setCommandForm = useUiStore((state) => state.setCommandForm);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Update filtered commands when query changes
    useEffect(() => {
        const results = searchCommands(query);
        setFilteredCommands(results);
        setSelectedIndex(0); // Reset selection when results change
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < filteredCommands.length - 1 ? prev + 1 : prev,
                );
                break;

            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                break;

            case "Enter":
                e.preventDefault();
                if (filteredCommands.length > 0) {
                    handleExecuteCommand(filteredCommands[selectedIndex]);
                }
                break;

            case "Escape":
                e.preventDefault();
                closeCommandPalette();
                break;
        }
    };

    const handleExecuteCommand = async (command: Command) => {
        await executeCommand(command, {
            closeCommandPalette,
            setCommandForm,
        });
    };

    return (
        <div className="bg-neutral-900 rounded-lg shadow-2xl overflow-hidden border border-neutral-700">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-700">
                <Search className="w-5 h-5 text-neutral-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        handleKeyDown(e);
                    }}
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none text-sm"
                    aria-label="Command search"
                    autoComplete="off"
                    spellCheck="false"
                />
                <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                        ↑↓
                    </kbd>
                    <span>to navigate</span>
                    <kbd className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                        ↵
                    </kbd>
                    <span>to select</span>
                </div>
            </div>
            <CommandList
                commands={filteredCommands}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
                onExecuteCommand={handleExecuteCommand}
            />
        </div>
    );
}
