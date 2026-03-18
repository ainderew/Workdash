import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockCopyButtonProps {
  code: string;
}

function CodeBlockCopyButton({ code }: CodeBlockCopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      setState('failed');
    }

    if (resetRef.current !== null) {
      window.clearTimeout(resetRef.current);
    }
    resetRef.current = window.setTimeout(() => {
      setState('idle');
    }, 1800);
  }, [code]);

  useEffect(() => {
    return () => {
      if (resetRef.current !== null) {
        window.clearTimeout(resetRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => { void handleCopy(); }}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors bg-[var(--wd-code-bg)] text-[var(--wd-code-text)] hover:text-[var(--wd-text-primary)]"
      aria-label={state === 'copied' ? 'Code copied' : 'Copy code'}
    >
      {state === 'copied' ? (
        <Check size={14} className="text-[var(--wd-success)]" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

export default React.memo(CodeBlockCopyButton);
