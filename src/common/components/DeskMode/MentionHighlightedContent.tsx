import React from 'react';
import {
  parseContentWithMentions,
  type MentionMemberNameMap,
} from '@/communication/chatV2/mentionUtils';
import { parseCustomEmojis } from '@/common/utils/customEmojiParser';
import CustomEmojiInline from './CustomEmojiInline';

interface MentionHighlightedContentProps {
  content: string;
  mentionedUserIds: number[];
  memberNameMap: MentionMemberNameMap;
  onClickMention?: (event: React.MouseEvent | React.KeyboardEvent, userId: number, displayName: string) => void;
}

/** Renders a plain text string with **bold** markdown parsed into <strong> elements. */
function renderBoldMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<strong key={`${keyPrefix}-bold-${match.index}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-plain-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={keyPrefix}>{text}</span>];
}

/** Renders text with custom emoji tokens replaced by inline images. */
function renderTextWithCustomEmojis(text: string, keyPrefix: string) {
  const tokens = parseCustomEmojis(text);
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return renderBoldMarkdown(text, keyPrefix);
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
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{renderBoldMarkdown(token.content, `${keyPrefix}-t-${i}`)}</React.Fragment>;
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
