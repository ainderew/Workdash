import React, { useCallback, useMemo } from "react";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PendingAttachmentUpload } from "@/communication/chatV2/_types";
import { ComposerAttachmentTile } from "./ComposerAttachmentTile";

interface ComposerAttachmentGridProps {
    uploads: PendingAttachmentUpload[];
    onReorder: (nextOrder: string[]) => void;
    onRemove: (clientId: string) => void;
    onCancel: (clientId: string) => void;
    onRetry: (clientId: string) => void;
    onPreviewClick: (url: string, name: string) => void;
}

interface SortableTileProps {
    upload: PendingAttachmentUpload;
    onRemove: () => void;
    onCancel: () => void;
    onRetry: () => void;
    onPreviewClick: (url: string, name: string) => void;
}

function SortableTile({
    upload,
    onRemove,
    onCancel,
    onRetry,
    onPreviewClick,
}: SortableTileProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: upload.clientId });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="touch-none"
        >
            <ComposerAttachmentTile
                upload={upload}
                onRemove={onRemove}
                onCancel={onCancel}
                onRetry={onRetry}
                onPreviewClick={onPreviewClick}
                isDragging={isDragging}
            />
        </div>
    );
}

export function ComposerAttachmentGrid({
    uploads,
    onReorder,
    onRemove,
    onCancel,
    onRetry,
    onPreviewClick,
}: ComposerAttachmentGridProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const ids = useMemo(() => uploads.map((u) => u.clientId), [uploads]);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = ids.indexOf(String(active.id));
            const newIndex = ids.indexOf(String(over.id));
            if (oldIndex < 0 || newIndex < 0) return;
            const next = ids.slice();
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            onReorder(next);
        },
        [ids, onReorder],
    );

    if (uploads.length === 0) return null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={ids} strategy={rectSortingStrategy}>
                <div
                    role="list"
                    aria-label="Attached files"
                    className="flex max-h-60 flex-wrap gap-2 overflow-y-auto p-2"
                >
                    {uploads.map((upload) => (
                        <SortableTile
                            key={upload.clientId}
                            upload={upload}
                            onRemove={() => onRemove(upload.clientId)}
                            onCancel={() => onCancel(upload.clientId)}
                            onRetry={() => onRetry(upload.clientId)}
                            onPreviewClick={onPreviewClick}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
