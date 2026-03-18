import React from 'react';

interface InlineCodeProps {
  code: string;
}

function InlineCode({ code }: InlineCodeProps) {
  return (
    <code className="rounded px-1.5 py-0.5 text-[0.85em] font-mono bg-[var(--wd-code-inline-bg)] text-[var(--wd-code-inline-text)]">
      {code}
    </code>
  );
}

export default React.memo(InlineCode);
