import React from 'react';
import { Volume2 } from 'lucide-react';

interface SpeakerTestProps {
  onTest: () => Promise<void>;
  isTesting: boolean;
}

function SpeakerTest({ onTest, isTesting }: SpeakerTestProps) {
  return (
    <button
      onClick={onTest}
      disabled={isTesting}
      className="flex items-center gap-2 rounded-md border wd-border-subtle bg-[var(--wd-surface-elevated)] px-4 py-2 text-xs font-medium wd-text-primary transition-all duration-150 hover:bg-[var(--wd-accent-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Volume2
        size={14}
        className={isTesting ? 'animate-pulse text-[var(--wd-accent)]' : ''}
      />
      {isTesting ? 'Playing...' : 'Test Speaker'}
    </button>
  );
}

export default SpeakerTest;
