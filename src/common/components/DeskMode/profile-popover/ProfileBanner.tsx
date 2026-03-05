import React from 'react';
import { Pencil } from 'lucide-react';
import type { BannerConfig } from '@/communication/chatV2/_types';
import { DEFAULT_BANNER_GRADIENT } from './constants';

interface ProfileBannerProps {
  banner?: BannerConfig;
  isSelf?: boolean;
  isEditing?: boolean;
  onEditClick?: () => void;
  children?: React.ReactNode;
}

export function getBannerStyle(
  banner: BannerConfig | undefined,
): React.CSSProperties {
  if (!banner) return { background: DEFAULT_BANNER_GRADIENT };

  switch (banner.type) {
    case 'solid':
      return { backgroundColor: banner.color };
    case 'gradient':
      return { background: banner.gradient };
    case 'image':
      return {
        backgroundImage: `url(${banner.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    default:
      return { background: DEFAULT_BANNER_GRADIENT };
  }
}

export function ProfileBanner({
  banner,
  isSelf = false,
  isEditing = false,
  onEditClick,
  children,
}: ProfileBannerProps) {
  return (
    <div className="relative h-[88px]" style={getBannerStyle(banner)}>
      {banner?.type === 'image' && (
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      )}

      {/* Self-only edit overlay */}
      {isSelf && !isEditing && onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          aria-label="Edit profile banner"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 hover:bg-black/40 hover:opacity-100 group cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5 rounded-md bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white/80">
            <Pencil size={12} />
            Edit Banner
          </span>
        </button>
      )}

      {children}
    </div>
  );
}
