import React, { useMemo, useState } from 'react';
import {
  Ban,
  Copy,
  Ellipsis,
  Flag,
  MessageSquare,
  UserCheck,
  UserRoundPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ChatV2FriendshipStatus } from '@/communication/chatV2/_types';
import useChatV2Store from '@/common/store/chatV2Store';

interface ProfileActionsProps {
  senderUserId: number;
  senderName: string;
  isSelf: boolean;
  friendshipStatus: ChatV2FriendshipStatus | null;
  onClose: () => void;
}

const getFriendActionMeta = (
  friendshipStatus: ChatV2FriendshipStatus | null,
) => {
  if (friendshipStatus === 'ACCEPTED') {
    return {
      isDisabled: true,
      label: 'Already Friends',
      tooltip: 'Already friends',
      isAccepted: true,
    };
  }
  if (friendshipStatus === 'PENDING') {
    return {
      isDisabled: true,
      label: 'Pending',
      tooltip: 'Friend request pending',
      isAccepted: false,
    };
  }
  return {
    isDisabled: false,
    label: 'Add Friend',
    tooltip: 'Add friend',
    isAccepted: false,
  };
};

export function ProfileActionButtons({
  senderUserId,
  senderName,
  isSelf,
  friendshipStatus,
}: Pick<
  ProfileActionsProps,
  'senderUserId' | 'senderName' | 'isSelf' | 'friendshipStatus'
>) {
  const requestFriend = useChatV2Store((state) => state.requestFriend);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const openDirectMessage = useChatV2Store(
    (state) => state.openDirectMessage,
  );

  const meta = useMemo(
    () => getFriendActionMeta(friendshipStatus),
    [friendshipStatus],
  );

  const handleAddFriend = async () => {
    if (isAddingFriend) return;
    setIsAddingFriend(true);
    try {
      await requestFriend(senderUserId);
      toast('Friend request sent', {
        description: `Sent to ${senderName}.`,
      });
    } catch (err) {
      toast('Unable to send friend request', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleOpenDm = async () => {
    try {
      await openDirectMessage(senderUserId);
      toast('Private message opened', {
        description: `You can now DM ${senderName}.`,
      });
    } catch (err) {
      toast('Unable to open private message', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="absolute right-3 top-3 flex items-center gap-2">
      {!isSelf && (
        <button
          type="button"
          disabled={isAddingFriend || meta.isDisabled}
          onClick={handleAddFriend}
          title={meta.tooltip}
          className={`h-9 w-9 rounded-full border inline-flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            meta.isAccepted
              ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60'
              : 'wd-border-subtle wd-bg-panel-2 wd-text-primary hover:bg-[var(--wd-surface-elevated)]'
          }`}
        >
          {meta.isAccepted ? (
            <UserCheck size={15} />
          ) : (
            <UserRoundPlus size={15} />
          )}
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMoreOptionsOpen((c) => !c)}
          title="More options"
          className="h-9 w-9 rounded-full border wd-border-subtle wd-bg-panel-2 wd-text-primary inline-flex items-center justify-center transition-colors hover:bg-[var(--wd-surface-elevated)]"
        >
          <Ellipsis size={16} />
        </button>

        {isMoreOptionsOpen && (
          <div
            data-user-profile-more="true"
            className="absolute right-0 top-[calc(100%+8px)] z-[175] w-56 rounded-xl border wd-border-strong wd-bg-panel shadow-[0_18px_42px_rgba(0,0,0,0.45)] p-1"
          >
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    String(senderUserId),
                  );
                  toast('User ID copied', {
                    description: `Copied ${senderUserId}.`,
                  });
                } catch {
                  toast('Unable to copy user ID', {
                    description: 'Please try again.',
                  });
                }
                setIsMoreOptionsOpen(false);
              }}
              className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
            >
              <Copy size={14} className="wd-text-secondary" />
              Copy User ID
            </button>
            {!isSelf && (
              <button
                type="button"
                onClick={() => {
                  void handleOpenDm();
                }}
                className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-primary transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
              >
                <MessageSquare size={14} className="wd-text-secondary" />
                Send Private Message
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                toast('Thanks for the report', {
                  description:
                    'Moderation review workflow is coming soon.',
                });
                setIsMoreOptionsOpen(false);
              }}
              className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-danger transition-colors hover:bg-[var(--wd-surface-elevated)] inline-flex items-center gap-2"
            >
              <Flag size={14} />
              Report User Profile
            </button>
            <button
              type="button"
              disabled
              className="w-full rounded px-2 py-1.5 text-left text-sm wd-text-muted inline-flex items-center gap-2 opacity-70"
            >
              <Ban size={14} />
              Block (Soon)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfileDmButton({
  senderUserId,
  senderName,
}: Pick<ProfileActionsProps, 'senderUserId' | 'senderName'>) {
  const openDirectMessage = useChatV2Store(
    (state) => state.openDirectMessage,
  );
  const [isOpeningDm, setIsOpeningDm] = useState(false);

  const handleOpenDm = async () => {
    if (isOpeningDm) return;
    setIsOpeningDm(true);
    try {
      await openDirectMessage(senderUserId);
      toast('Private message opened', {
        description: `You can now DM ${senderName}.`,
      });
    } catch (err) {
      toast('Unable to open private message', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsOpeningDm(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleOpenDm();
      }}
      disabled={isOpeningDm}
      className="w-full h-9 rounded-md bg-[var(--wd-accent)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors hover:bg-[var(--wd-accent-hover)] disabled:opacity-70"
    >
      <MessageSquare size={14} />
      {isOpeningDm ? 'Opening...' : 'Send Private Message'}
    </button>
  );
}
