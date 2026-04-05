import React from 'react';
import { parseCodeBlocks } from '@/common/utils/codeBlockParser';
import { parseMessageContent, type ParsedMessage } from '@/common/utils/linkParser';
import type { MentionMemberNameMap } from '@/communication/chatV2/mentionUtils';
import MentionHighlightedContent from './MentionHighlightedContent';
import CodeBlock from './CodeBlock/CodeBlock';
import InlineCode from './CodeBlock/InlineCode';

interface MessageContentRendererProps {
  content: string;
  messageId: string;
  mentionedUserIds: number[];
  memberNameMap: MentionMemberNameMap;
  onClickMention?: (event: React.MouseEvent | React.KeyboardEvent, userId: number, displayName: string) => void;
  skipLinkPreviews?: boolean;
}

/** Renders a single line of text through the URL + mention pipeline. */
function renderTextLine(
  text: string,
  messageId: string,
  mentionedUserIds: number[],
  memberNameMap: MentionMemberNameMap,
  onClickMention: MessageContentRendererProps['onClickMention'],
  skipLinkPreviews: boolean | undefined,
  keyPrefix: string,
) {
  // Check for hyperlink markdown [text](url) to avoid double-matching with bare URL detection.
  // Strip hyperlinks before passing to parseMessageContent so they aren't detected as bare URLs.
  const hyperlinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const hasHyperlinks = hyperlinkRegex.test(text);

  // If the text has no hyperlinks, use the existing URL detection pipeline
  if (!hasHyperlinks) {
    const parsedParts = parseMessageContent(text);
    const hasLinks = !skipLinkPreviews && parsedParts.some(
      (part) => part.type !== 'text' && !!part.url,
    );

    if (hasLinks) {
      return (
        <>
          {parsedParts.map((part, index) => {
            if (part.type !== 'text' && part.url) {
              return (
                <a
                  key={`${keyPrefix}-link-${index}`}
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wd-text-accent hover:underline break-all"
                >
                  {part.content}
                </a>
              );
            }
            if (part.type !== 'text') return null;
            return (
              <MentionHighlightedContent
                key={`${keyPrefix}-text-${index}`}
                content={part.content}
                mentionedUserIds={mentionedUserIds}
                memberNameMap={memberNameMap}
                onClickMention={onClickMention}
              />
            );
          })}
        </>
      );
    }
  }

  // For text with hyperlinks or no detected bare URLs, use MentionHighlightedContent
  // which handles inline markdown (including [text](url) tokens)
  return (
    <MentionHighlightedContent
      content={text}
      mentionedUserIds={mentionedUserIds}
      memberNameMap={memberNameMap}
      onClickMention={onClickMention}
    />
  );
}

/**
 * Renders text segments through the URL + mention pipeline.
 * Handles link detection, bullet lists, and mention/emoji/inline-markdown highlighting.
 */
function TextSegmentRenderer({
  text,
  messageId,
  mentionedUserIds,
  memberNameMap,
  onClickMention,
  skipLinkPreviews,
}: {
  text: string;
  messageId: string;
  mentionedUserIds: number[];
  memberNameMap: MentionMemberNameMap;
  onClickMention?: (event: React.MouseEvent | React.KeyboardEvent, userId: number, displayName: string) => void;
  skipLinkPreviews?: boolean;
}) {
  // Split text into lines and detect bullet list blocks
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    // Detect consecutive bullet list lines
    if (lines[i].startsWith('- ')) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`${messageId}-list-${i}`} className="list-disc pl-5 my-1">
          {listItems.map((item, idx) => (
            <li key={`${messageId}-li-${i}-${idx}`}>
              {renderTextLine(
                item,
                messageId,
                mentionedUserIds,
                memberNameMap,
                onClickMention,
                skipLinkPreviews,
                `${messageId}-li-${i}-${idx}`,
              )}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Detect consecutive ordered list lines (1. item, 2. item, …)
    if (/^\d+\.\s/.test(lines[i])) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`${messageId}-ol-${i}`} className="list-decimal pl-5 my-1">
          {listItems.map((item, idx) => (
            <li key={`${messageId}-oli-${i}-${idx}`}>
              {renderTextLine(
                item,
                messageId,
                mentionedUserIds,
                memberNameMap,
                onClickMention,
                skipLinkPreviews,
                `${messageId}-oli-${i}-${idx}`,
              )}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Regular text line
    const line = lines[i];
    if (i > 0 && elements.length > 0) {
      elements.push(<br key={`${messageId}-br-${i}`} />);
    }
    if (line) {
      elements.push(
        <React.Fragment key={`${messageId}-line-${i}`}>
          {renderTextLine(
            line,
            messageId,
            mentionedUserIds,
            memberNameMap,
            onClickMention,
            skipLinkPreviews,
            `${messageId}-seg-${i}`,
          )}
        </React.Fragment>,
      );
    }
    i++;
  }

  return <>{elements}</>;
}

/**
 * Shared message content renderer that owns the full pipeline:
 * code block parsing → URL splitting → mention/emoji/inline-markdown rendering.
 */
function MessageContentRenderer({
  content,
  messageId,
  mentionedUserIds,
  memberNameMap,
  onClickMention,
  skipLinkPreviews,
}: MessageContentRendererProps) {
  const segments = parseCodeBlocks(content);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'code_block') {
          return (
            <CodeBlock
              key={`${messageId}-codeblock-${index}`}
              code={segment.code}
              language={segment.language}
              messageId={String(messageId)}
            />
          );
        }

        if (segment.type === 'inline_code') {
          return (
            <InlineCode
              key={`${messageId}-inline-${index}`}
              code={segment.code}
            />
          );
        }

        return (
          <TextSegmentRenderer
            key={`${messageId}-seg-${index}`}
            text={segment.content}
            messageId={messageId}
            mentionedUserIds={mentionedUserIds}
            memberNameMap={memberNameMap}
            onClickMention={onClickMention}
            skipLinkPreviews={skipLinkPreviews}
          />
        );
      })}
    </>
  );
}

export default MessageContentRenderer;

/**
 * Helper to extract link parts from content for link preview rendering.
 * Used by parent components that still need to render UnifiedLinkPreview.
 */
export function extractLinkParts(content: string): ParsedMessage[] {
  const segments = parseCodeBlocks(content);
  const linkParts: ParsedMessage[] = [];

  for (const segment of segments) {
    if (segment.type === 'text') {
      const parts = parseMessageContent(segment.content);
      for (const part of parts) {
        if (part.type !== 'text' && part.url) {
          linkParts.push(part);
        }
      }
    }
  }

  return linkParts;
}
