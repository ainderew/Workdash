import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Handles drag-and-drop file uploads on a target element.
 * Uses a counter to correctly track nested dragenter/dragleave events.
 * Passes all dropped files (not just the first) so callers can support
 * multi-file uploads.
 */
export function useFileDrop(onFilesDrop: (files: File[]) => void) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDrop(files);
      }
    },
    [onFilesDrop],
  );

  // Reset counter if drag leaves the window entirely
  useEffect(() => {
    const handleWindowDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    };

    window.addEventListener('drop', handleWindowDragEnd);
    return () => window.removeEventListener('drop', handleWindowDragEnd);
  }, []);

  return {
    isDraggingOver,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
