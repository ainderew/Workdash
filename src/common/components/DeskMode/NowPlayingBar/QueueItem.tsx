import React from "react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QueuedTrack } from "@/common/store/musicStore";
import { formatDuration } from "@/common/utils/formatDuration";

interface QueueItemProps {
  track: QueuedTrack;
  index: number;
  sortableId: string;
}

export function QueueItem({ track, index, sortableId }: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--wd-surface-base)] rounded-sm transition-colors ${
        isDragging ? "opacity-50 border border-[var(--wd-accent)] bg-[var(--wd-surface-elevated)] rounded-md z-10" : ""
      }`}
    >
      <button
        type="button"
        className="shrink-0 p-0 cursor-grab active:cursor-grabbing wd-text-muted hover:wd-text-secondary transition-colors opacity-0 group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <span className="wd-text-muted text-[10px] w-4 shrink-0 text-right tabular-nums">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="wd-text-primary text-[11px] font-medium truncate leading-tight">
          {track.title}
        </p>
        <p className="wd-text-muted text-[10px] truncate leading-tight">
          by {track.requestedBy}
          {track.duration > 0 && (
            <span className="ml-1 opacity-60">
              {formatDuration(track.duration)}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
