import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import useSoundboardStore from '@/common/store/soundboardStore';
import SoundboardPopover from './SoundboardPopover';

function SoundboardButton() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlaying = useSoundboardStore((s) => s.isPlaying);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        title="Soundboard"
        className={`wd-dock-action-btn ${isPlaying ? 'wd-dock-action-btn--accent' : ''}`}
      >
        <Volume2 size={15} />
      </button>

      {isOpen && <SoundboardPopover />}
    </div>
  );
}

export default SoundboardButton;
