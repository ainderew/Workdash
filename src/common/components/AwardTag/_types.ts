import type { DotaAwardTagType } from '@/communication/chatV2/_types';

export interface AwardTagProps {
  type: DotaAwardTagType;
  label: string;
  size?: 'sm' | 'xs';
}
