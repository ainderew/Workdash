import type React from 'react';

export type SenderAvatar =
  | { mode: 'sprite'; style: React.CSSProperties }
  | { mode: 'image'; src: string }
  | { mode: 'fallback' };

export type ProfilePopoverState = {
  x: number;
  y: number;
  anchorBottom?: boolean;
  /**
   * Rectangle of the element that opened the popover (used for caret pointer
   * and toggle-on-reclick). Optional for back-compat with callers that still
   * pass raw coordinates.
   */
  anchorRect?: DOMRect;
  /**
   * Hint for which side of the anchor to prefer. Defaults to 'right' (grow
   * rightward from the click). Member panel passes 'left' so the popover
   * never overlaps the panel itself.
   */
  preferredSide?: 'left' | 'right';
  senderUserId: number;
  senderName: string;
  senderAvatar: SenderAvatar;
};
