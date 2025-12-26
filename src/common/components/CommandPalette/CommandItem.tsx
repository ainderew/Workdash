import { Command } from './types';

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}

export default function CommandItem({
  command,
  isSelected,
  onSelect,
  onHover,
}: CommandItemProps) {
  const Icon = command.icon;

  return (
    <button
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${
          isSelected
            ? 'bg-neutral-700 border-l-2 border-cyan-500'
            : 'hover:bg-neutral-800'
        }
      `}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{command.name}</div>
        <div className="text-xs text-neutral-400 truncate">
          {command.description}
        </div>
      </div>
      {command.category && (
        <div className="flex-shrink-0 text-xs text-neutral-500 px-2 py-1 rounded bg-neutral-800">
          {command.category}
        </div>
      )}
    </button>
  );
}
