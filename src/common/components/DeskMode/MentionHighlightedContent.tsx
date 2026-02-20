import React from 'react';
import {
  parseContentWithMentions,
  type MentionMemberNameMap,
} from '@/communication/chatV2/mentionUtils';

interface MentionHighlightedContentProps {
  content: string;
  mentionedUserIds: number[];
  memberNameMap: MentionMemberNameMap;
  onClickMention?: (event: React.MouseEvent, userId: number, displayName: string) => void;
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
          <span key={`text-${index}`}>{segment.content}</span>
        );
      })}
    </>
  );
}

export default MentionHighlightedContent;
