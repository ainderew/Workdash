import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CodeBlockCopyButton from './CodeBlockCopyButton';
import { useHighlighter } from './useHighlighter';

const COLLAPSE_THRESHOLD = 25;
const VISIBLE_LINES_WHEN_COLLAPSED = 15;

interface CodeBlockProps {
  code: string;
  language: string;
  messageId: string;
}

function CodeBlock({ code, language, messageId }: CodeBlockProps) {
  const { highlight } = useHighlighter();
  const lines = useMemo(() => code.split('\n'), [code]);
  const isCollapsible = lines.length > COLLAPSE_THRESHOLD;
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleCode = isCollapsible && !isExpanded
    ? lines.slice(0, VISIBLE_LINES_WHEN_COLLAPSED).join('\n')
    : code;

  const highlightedHtml = useMemo(
    () => highlight(visibleCode, language),
    [highlight, visibleCode, language],
  );

  // Split highlighted HTML into lines for line-number alignment
  const highlightedLines = useMemo(
    () => highlightedHtml.split('\n'),
    [highlightedHtml],
  );

  const hiddenLineCount = lines.length - VISIBLE_LINES_WHEN_COLLAPSED;

  return (
    <div
      className="my-2 rounded-md border border-[var(--wd-code-border)] overflow-hidden"
      dir="ltr"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-[var(--wd-code-header-bg)] text-[var(--wd-code-text)]">
        <span className="font-mono opacity-70">
          {language || 'text'}
        </span>
        <CodeBlockCopyButton code={code} />
      </div>

      {/* Code area */}
      <div className="overflow-x-auto bg-[var(--wd-code-bg)]">
        <pre className="m-0 p-3 text-sm leading-relaxed">
          <code className="hljs font-mono text-[var(--wd-code-text)]">
            <table className="border-collapse">
              <tbody>
                {highlightedLines.map((lineHtml, i) => (
                  <tr key={`${messageId}-line-${i}`}>
                    <td
                      className="pr-4 text-right select-none text-[var(--wd-code-line-number)] opacity-50 align-top whitespace-nowrap"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </td>
                    <td
                      className="whitespace-pre"
                      dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </code>
        </pre>
      </div>

      {/* Collapse/expand button */}
      {isCollapsible && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1 px-3 py-1.5 text-xs transition-colors bg-[var(--wd-code-header-bg)] text-[var(--wd-code-text)] hover:text-[var(--wd-text-primary)]"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show {hiddenLineCount} more lines
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default React.memo(CodeBlock);
