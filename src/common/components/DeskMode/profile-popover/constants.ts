export type { BannerConfig } from '@/communication/chatV2/_types';

export const MAX_BIO_LENGTH = 280;
export const POPOVER_WIDTH = 360;
export const POPOVER_HEIGHT = 420;
export const SCREEN_MARGIN = 8;

export const DEFAULT_BANNER_GRADIENT =
  'linear-gradient(120deg,rgba(88,101,242,0.18),rgba(15,17,21,0.98))';

export const BANNER_SOLID_PRESETS = [
  { label: 'Blurple', color: '#5865F2' },
  { label: 'Green', color: '#57F287' },
  { label: 'Yellow', color: '#FEE75C' },
  { label: 'Pink', color: '#EB459E' },
  { label: 'Red', color: '#ED4245' },
  { label: 'Emerald', color: '#3BA55D' },
  { label: 'Purple', color: '#9B59B6' },
  { label: 'Teal', color: '#1ABC9C' },
] as const;

export const BANNER_GRADIENT_PRESETS = [
  {
    label: 'Sunset',
    gradient: 'linear-gradient(120deg, #5865F2, #EB459E)',
  },
  {
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #3BA55D, #1ABC9C)',
  },
  {
    label: 'Twilight',
    gradient: 'linear-gradient(135deg, #9B59B6, #5865F2)',
  },
  {
    label: 'Warmth',
    gradient: 'linear-gradient(120deg, #FEE75C, #EB459E)',
  },
  {
    label: 'Deep Sea',
    gradient: 'linear-gradient(135deg, #1ABC9C, #5865F2)',
  },
  {
    label: 'Berry',
    gradient: 'linear-gradient(120deg, #ED4245, #9B59B6)',
  },
] as const;
