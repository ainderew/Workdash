import React, { useMemo } from 'react';
import { splitOnMatches } from '@/common/utils/highlightText';

interface HighlightedTextProps {
  text: string;
  query: string;
  /** Forwarded to a wrapping <span> only when provided. */
  className?: string;
}

/**
 * Renders `text`, wrapping the runs that match `query` in <mark>. Presentational
 * only — all matching logic lives in `splitOnMatches`. When `query` is empty it
 * renders the raw text with no <mark> wrappers.
 */
function HighlightedText({ text, query, className }: HighlightedTextProps) {
  const segments = useMemo(() => splitOnMatches(text, query), [text, query]);

  // Fast path: nothing to highlight.
  if (query.trim() === '') {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }

  const content = segments.map((segment, index) =>
    segment.isMatch ? (
      <mark key={index} className="wd-search-hl">
        {segment.text}
      </mark>
    ) : (
      <React.Fragment key={index}>{segment.text}</React.Fragment>
    ),
  );

  return className ? <span className={className}>{content}</span> : <>{content}</>;
}

export default HighlightedText;
