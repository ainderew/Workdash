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
  onClickMention?: (event: React.MouseEvent, userId: number, displayName: string) => void;
}

/** Renders text with custom emoji tokens replaced by inline images. */
function renderTextWithCustomEmojis(text: string, keyPrefix: string) {
  const tokens = parseCustomEmojis(text);
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return <span key={keyPrefix}>{text}</span>;
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
    return <span key={`${keyPrefix}-t-${i}`}>{token.content}</span>;
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
        if (segment.type === 'mention') {
          return (
            <span
              key={`mention-${segment.userId}-${index}`}
              className={`bg-[var(--wd-accent-soft)] text-[var(--wd-accent)] font-medium rounded px-0.5${onClickMention ? ' cursor-pointer hover:underline' : ''}`}
              role={onClickMention ? 'button' : undefined}
              tabIndex={onClickMention ? 0 : undefined}
              onClick={onClickMention ? (e) => onClickMention(e, segment.userId, segment.displayName) : undefined}
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
