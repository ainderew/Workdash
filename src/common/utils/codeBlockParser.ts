import type { CodeSegment } from '@/common/components/DeskMode/CodeBlock/_types';

const FENCED_BLOCK_REGEX = /^```(\w*)\n([\s\S]*?)^```\s*$/gm;
const INLINE_CODE_REGEX = /`([^`\n]+)`/g;

/**
 * Parses message content into code segments (fenced blocks, inline code, and plain text).
 * Content inside code segments is never processed by URL, mention, emoji, or bold parsers.
 */
export function parseCodeBlocks(content: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  const protectedRanges: Array<{ start: number; end: number; segment: CodeSegment }> = [];

  // Pass 1: Extract fenced code blocks
  let match: RegExpExecArray | null;
  const fencedRegex = new RegExp(FENCED_BLOCK_REGEX.source, FENCED_BLOCK_REGEX.flags);
  while ((match = fencedRegex.exec(content)) !== null) {
    protectedRanges.push({
      start: match.index,
      end: match.index + match[0].length,
      segment: {
        type: 'code_block',
        language: match[1] || '',
        code: match[2],
      },
    });
  }

  // Pass 2: Extract inline code from unprotected text
  const inlineRanges: Array<{ start: number; end: number; segment: CodeSegment }> = [];
  const inlineRegex = new RegExp(INLINE_CODE_REGEX.source, INLINE_CODE_REGEX.flags);
  while ((match = inlineRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // Skip if overlaps with a fenced block
    const overlaps = protectedRanges.some(
      (range) => matchStart < range.end && matchEnd > range.start,
    );
    if (!overlaps) {
      inlineRanges.push({
        start: matchStart,
        end: matchEnd,
        segment: { type: 'inline_code', code: match[1] },
      });
    }
  }

  // Combine and sort all ranges by position
  const allRanges = [...protectedRanges, ...inlineRanges].sort(
    (a, b) => a.start - b.start,
  );

  // Assemble segments in document order
  let cursor = 0;
  for (const range of allRanges) {
    if (range.start > cursor) {
      const text = content.slice(cursor, range.start);
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }
    segments.push(range.segment);
    cursor = range.end;
  }

  // Remaining text after last range
  if (cursor < content.length) {
    const text = content.slice(cursor);
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  // If no code segments found, return single text segment
  if (segments.length === 0 && content) {
    return [{ type: 'text', content }];
  }

  return segments;
}
