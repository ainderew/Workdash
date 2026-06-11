import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SettingsSection, SettingsToggle } from '../settings-primitives';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { usePushNotifications } from '@/common/hooks/usePushNotifications';

function GeneralPanel() {
  const {
    workspaces,
    defaultWorkspaceId,
    setDefaultWorkspaceId,
    autoJoinMusic,
    setAutoJoinMusic,
    loungeNudges,
    setLoungeNudges,
    loungeAutoJoin,
    setLoungeAutoJoin,
    loungeHours,
    updateLoungeHours,
  } = useGeneralSettings();
  const push = usePushNotifications();

  const pushDescription = (() => {
    if (push.state === 'unsupported') return 'Your browser does not support web push notifications.';
    if (push.state === 'denied') return 'Notifications are blocked. Enable them in your browser site settings, then retry.';
    if (push.state === 'subscribed') return 'You will receive notifications for mentions and replies when WorkDash is in the background.';
    return 'Get notified about mentions and replies even when WorkDash is in the background.';
  })();

  return (
    <div className="space-y-4">
      <SettingsSection
        label="Default Workspace"
        description="Auto-loads when you open WorkDash"
      >
        <div>
          <p
            id="default-workspace-sublabel"
            className="text-[10px] font-bold uppercase tracking-widest wd-text-muted mb-1.5"
          >
            Workspace
          </p>
          <div className="relative">
            <select
              id="default-workspace-select"
              aria-labelledby="default-workspace-sublabel"
              value={defaultWorkspaceId}
              onChange={(e) => setDefaultWorkspaceId(e.target.value)}
              className="wd-settings-select h-9 w-full appearance-none rounded-lg border wd-border-subtle px-3 pr-8 text-xs wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)]"
              style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
            >
              <option value="">None — show workspace selector</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection label="Music">
        <SettingsToggle
          label="Auto-join music sessions"
          description="Automatically listen to music when entering a workspace with an active session"
          checked={autoJoinMusic}
          onChange={(checked) => setAutoJoinMusic(checked)}
        />
      </SettingsSection>

      <SettingsSection
        label="Lounge"
        description="The always-open hangout spot pinned in your sidebar"
      >
        <SettingsToggle
          label="Suggest hanging out"
          description="Nudge me when friends are online during lounge hours, or when the lounge goes live"
          checked={loungeNudges}
          onChange={(checked) => setLoungeNudges(checked)}
        />
        <SettingsToggle
          label="Auto-join a live lounge on open"
          description="5-second countdown when you open WorkDash with the lounge live — joins muted"
          checked={loungeAutoJoin}
          onChange={(checked) => setLoungeAutoJoin(checked)}
        />
        <div className="mt-3">
          <p
            id="lounge-hours-sublabel"
            className="text-[10px] font-bold uppercase tracking-widest wd-text-muted mb-1.5"
          >
            Lounge hours
          </p>
          <div className="flex items-center gap-2">
            {(['startHour', 'endHour'] as const).map((field, index) => (
              <React.Fragment key={field}>
                {index === 1 && (
                  <span className="text-xs wd-text-muted">to</span>
                )}
                <div className="relative flex-1">
                  <select
                    aria-label={index === 0 ? 'Lounge hours start' : 'Lounge hours end'}
                    value={loungeHours[field]}
                    onChange={(e) =>
                      updateLoungeHours({
                        ...loungeHours,
                        [field]: Number(e.target.value),
                      })
                    }
                    className="wd-settings-select h-9 w-full appearance-none rounded-lg border wd-border-subtle px-3 pr-8 text-xs wd-text-primary outline-none transition-all duration-150 focus:border-[var(--wd-accent)] focus:shadow-[0_0_0_3px_var(--wd-accent-soft)]"
                    style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 wd-text-muted"
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] wd-text-muted">
            Friend-online nudges only fire in this window. A live lounge always notifies.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection label="Notifications">
        <SettingsToggle
          label="Push notifications"
          description={pushDescription}
          checked={push.state === 'subscribed'}
          disabled={push.busy || push.state === 'unsupported' || push.state === 'denied'}
          onChange={(checked) => {
            if (checked) void push.subscribe();
            else void push.unsubscribe();
          }}
        />
        {push.error && (
          <p className="mt-2 text-xs wd-text-danger">{push.error}</p>
        )}
      </SettingsSection>
    </div>
  );
}

export default GeneralPanel;
