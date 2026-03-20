import React from 'react';
import {
  parseContentWithMentions,
  type MentionMemberNameMap,
} from '@/communication/chatV2/mentionUtils';
import { parseCustomEmojis } from '@/common/utils/customEmojiParser';
import { parseInlineMarkdown } from '@/common/utils/inlineMarkdownParser';
import CustomEmojiInline from './CustomEmojiInline';

interface MentionHighlightedContentProps {
  content: string;
  mentionedUserIds: number[];
  memberNameMap: MentionMemberNameMap;
  onClickMention?: (event: React.MouseEvent | React.KeyboardEvent, userId: number, displayName: string) => void;
}

/** Renders inline markdown tokens (bold, italic, underline, hyperlink) as React elements. */
function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const tokens = parseInlineMarkdown(text);
  return tokens.map((token, i) => {
    const key = `${keyPrefix}-${token.type}-${i}`;
    switch (token.type) {
      case 'bold':
        return <strong key={key}>{token.content}</strong>;
      case 'italic':
        return <em key={key}>{token.content}</em>;
      case 'underline':
        return <span key={key} className="underline">{token.content}</span>;
      case 'hyperlink':
        return (
          <a
            key={key}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wd-text-accent hover:underline"
            title={token.url}
          >
            {token.text}
          </a>
        );
      case 'text':
      default:
        return <span key={key}>{token.content}</span>;
    }
  });
}

/** Renders text with custom emoji tokens replaced by inline images. */
function renderTextWithCustomEmojis(text: string, keyPrefix: string) {
  const tokens = parseCustomEmojis(text);
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return renderInlineMarkdown(text, keyPrefix);
  }
  return tokens.map((token, i) => {
    if (token.type === 'custom_emoji' && token.emojiId && token.emojiName) {
      return (
        <CustomEmojiInline
          key={`${keyPrefix}-ce-${i}`}
          emojiId={token.emojiId}
          name={token.emojiName}
        />
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{renderInlineMarkdown(token.content, `${keyPrefix}-t-${i}`)}</React.Fragment>;
  });
}

function MentionHighlightedContent({
  content,
  mentionedUserIds,
  memberNameMap,
  onClickMention,
}: MentionHighlightedContentProps) {
  const segments = parseContentWithMentions(
    content,
    mentionedUserIds,
    memberNameMap,
  );

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'everyone_mention') {
          return (
            <span
              key={`everyone-${index}`}
              className="bg-[var(--wd-accent-soft)] text-[var(--wd-accent)] font-medium rounded px-0.5"
            >
              @everyone
            </span>
          );
        }

        if (segment.type === 'mention') {
          return (
            <span
              key={`mention-${segment.userId}-${index}`}
              className={`bg-[var(--wd-accent-soft)] text-[var(--wd-accent)] font-medium rounded px-0.5${onClickMention ? ' cursor-pointer hover:underline' : ''}`}
              role={onClickMention ? 'button' : undefined}
              tabIndex={onClickMention ? 0 : undefined}
              onClick={onClickMention ? (e) => onClickMention(e, segment.userId, segment.displayName) : undefined}
              onKeyDown={onClickMention ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClickMention(e, segment.userId, segment.displayName);
                }
              } : undefined}
            >
              @{segment.displayName}
            </span>
          );
        }

        return (
          <React.Fragment key={`text-${index}`}>
            {renderTextWithCustomEmojis(segment.content, `seg-${index}`)}
          </React.Fragment>
        );
      })}
    </>
  );
}

export default MentionHighlightedContent;
