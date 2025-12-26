import React from "react";
import { useEffect, useRef } from "react";
import { Command } from "./types";
import CommandItem from "./CommandItem";

interface CommandListProps {
    commands: Command[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onExecuteCommand: (command: Command) => void;
}

export default function CommandList({
    commands,
    selectedIndex,
    onSelectIndex,
    onExecuteCommand,
}: CommandListProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedRef.current && listRef.current) {
            selectedRef.current.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);

    if (commands.length === 0) {
        return (
            <div className="p-8 text-center text-neutral-400">
                <p className="text-sm">No commands found</p>
                <p className="text-xs mt-1">Try a different search term</p>
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className="max-h-96 overflow-y-auto"
            role="listbox"
            aria-label="Available commands"
        >
            {commands.map((command, index) => (
                <div
                    key={command.id}
                    ref={index === selectedIndex ? selectedRef : null}
                >
                    <CommandItem
                        command={command}
                        isSelected={index === selectedIndex}
                        onSelect={() => onExecuteCommand(command)}
                        onHover={() => onSelectIndex(index)}
                    />
                </div>
            ))}
        </div>
    );
}
