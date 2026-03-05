import type React from 'react';

export type SenderAvatar =
  | { mode: 'sprite'; style: React.CSSProperties }
  | { mode: 'image'; src: string }
  | { mode: 'fallback' };

export type ProfilePopoverState = {
  x: number;
  y: number;
  anchorBottom?: boolean;
  senderUserId: number;
  senderName: string;
  senderAvatar: SenderAvatar;
};
