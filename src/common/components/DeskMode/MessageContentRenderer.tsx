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
  onClickMention?: (event: React.MouseEvent, userId: number, displayName: string) => void;
  skipLinkPreviews?: boolean;
}

/**
 * Renders text segments through the URL + mention pipeline.
 * Handles link detection and mention/emoji/bold highlighting.
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
  onClickMention?: (event: React.MouseEvent, userId: number, displayName: string) => void;
  skipLinkPreviews?: boolean;
}) {
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
                key={`${messageId}-link-${index}`}
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
              key={`${messageId}-text-${index}`}
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
 * Shared message content renderer that owns the full pipeline:
 * code block parsing → URL splitting → mention/emoji/bold rendering.
 *
 * Returns the parsed link parts for use by the parent (link previews).
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
