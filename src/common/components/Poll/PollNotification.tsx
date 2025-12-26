import { useEffect, useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import usePollStore from '@/common/store/pollStore';
import type { Poll } from './types';

export default function PollNotification() {
  const [notification, setNotification] = useState<Poll | null>(null);
  const polls = usePollStore((state) => state.polls);
  const setActivePoll = usePollStore((state) => state.setActivePoll);

  useEffect(() => {
    // Show notification for the latest poll
    if (polls.length > 0) {
      const latestPoll = polls[polls.length - 1];
      setNotification(latestPoll);

      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [polls]);

  const handleClick = () => {
    if (notification) {
      setActivePoll(notification.id);
      setNotification(null);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotification(null);
  };

  if (!notification) return null;

  return (
    <div
      onClick={handleClick}
      className="fixed top-4 right-4 z-55 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-4 max-w-sm cursor-pointer hover:bg-neutral-800 transition-colors animate-in slide-in-from-right duration-300"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <MessageSquarePlus className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">New Poll</p>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-neutral-300 mb-1">
            From {notification.creatorName}
          </p>
          <p className="text-xs text-neutral-400 truncate">
            {notification.question}
          </p>
          <p className="text-xs text-cyan-400 mt-2">Click to vote</p>
        </div>
      </div>
    </div>
  );
}
