import React from 'react';
import useCustomEmojiStore from '@/common/store/customEmojiStore';

interface CustomEmojiInlineProps {
  emojiId: string;
  name: string;
}

function CustomEmojiInline({ emojiId, name }: CustomEmojiInlineProps) {
  const emoji = useCustomEmojiStore((s) => s.findEmojiById(emojiId));
  if (!emoji) return <span className="wd-text-muted">:{name}:</span>;
  return (
    <img
      src={emoji.imageUrl}
      alt={`:${name}:`}
      title={`:${name}:`}
      className="inline-block h-[1.4em] w-[1.4em] align-text-bottom"
      loading="lazy"
    />
  );
}

export default React.memo(CustomEmojiInline);
