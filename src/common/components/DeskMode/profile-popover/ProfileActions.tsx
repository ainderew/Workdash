import React, { useMemo, useState } from 'react';
import {
  Ban,
  Copy,
  Ellipsis,
  Flag,
  MessageSquare,
  SendHorizontal,
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
    <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
      {!isSelf && (
        <button
          type="button"
          disabled={isAddingFriend || meta.isDisabled}
          onClick={handleAddFriend}
          title={meta.tooltip}
          className={`h-8 w-8 rounded-full inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
            meta.isAccepted
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 hover:text-white hover:scale-105'
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
          className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm text-white/80 inline-flex items-center justify-center transition-all duration-150 hover:bg-black/50 hover:text-white hover:scale-105"
        >
          <Ellipsis size={16} />
        </button>

        {isMoreOptionsOpen && (
          <div
            data-user-profile-more="true"
            className="absolute right-0 top-[calc(100%+6px)] z-[175] w-52 rounded-lg border border-white/[0.06] wd-bg-panel backdrop-blur-xl shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.4)] p-1"
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
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors duration-100 hover:bg-white/[0.06] inline-flex items-center gap-2"
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
                className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-primary transition-colors duration-100 hover:bg-white/[0.06] inline-flex items-center gap-2"
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
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-danger transition-colors duration-100 hover:bg-white/[0.06] inline-flex items-center gap-2"
            >
              <Flag size={14} />
              Report User Profile
            </button>
            <button
              type="button"
              disabled
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] wd-text-muted inline-flex items-center gap-2 opacity-70"
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

export function ProfileQuickMessage({
  senderUserId,
  senderName,
}: Pick<ProfileActionsProps, 'senderUserId' | 'senderName'>) {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const { ChatV2Service } = await import(
        '@/communication/chatV2/chatV2Service'
      );
      const chatV2Service = ChatV2Service.getInstance();
      const room = await chatV2Service.openDirectMessage(senderUserId);
      await chatV2Service.createMessage(room.id, trimmed);
      setValue('');
      toast('Message sent', {
        description: `Sent to ${senderName}.`,
      });
    } catch (err) {
      toast('Unable to send message', {
        description:
          err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.04] wd-bg-panel-2 px-3 py-2.5 transition-colors duration-200 focus-within:border-white/[0.12] focus-within:bg-[var(--wd-surface-elevated)]">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
          }
        }}
        disabled={isSending}
        placeholder={`Message @${senderName}`}
        className="min-w-0 flex-1 bg-transparent text-[13px] wd-text-primary placeholder:wd-text-muted placeholder:opacity-50 outline-none"
      />
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={isSending || !value.trim()}
        title={isSending ? 'Sending...' : 'Send message'}
        className="h-7 w-7 shrink-0 rounded-full inline-flex items-center justify-center text-[var(--wd-text-muted)] transition-all duration-150 hover:text-white hover:bg-[var(--wd-accent)] hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        <SendHorizontal size={14} />
      </button>
    </div>
  );
}
