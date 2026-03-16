import React from "react";

interface ListenButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

export function ListenButton({ isListening, onToggle }: ListenButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`mt-0.5 px-5 py-0.5 text-[11px] font-normal rounded-sm transition-colors ${
        isListening
          ? "bg-[var(--wd-danger)] text-white hover:bg-[var(--wd-danger-hover,var(--wd-danger))]"
          : "bg-[var(--wd-accent)] text-white"
      }`}
    >
      {isListening ? "Leave" : "Join"}
    </button>
  );
}
