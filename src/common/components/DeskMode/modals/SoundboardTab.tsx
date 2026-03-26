import React from 'react';
import { Loader2, Volume2, Lock } from 'lucide-react';
import useSoundboardStore from '@/common/store/soundboardStore';
import useUserStore from '@/common/store/useStore';
import SoundboardUploadForm from './SoundboardUploadForm';
import SoundboardListItem from './SoundboardListItem';

const MAX_WORKSPACE_SOUNDS = 50;
const MAX_PERSONAL_SOUNDS = 10;

interface SoundboardTabProps {
  workspaceId: string;
  canManage: boolean;
}

function SoundboardTab({ workspaceId, canManage }: SoundboardTabProps) {
  const workspaceSounds = useSoundboardStore((s) => s.workspaceSounds);
  const personalSounds = useSoundboardStore((s) => s.personalSounds);
  const isLoading = useSoundboardStore((s) => s.isLoading);
  const viewerUserId = useUserStore((s) => s.backendUser?.id ?? 0);

  const viewerPersonalCount = personalSounds.length;
  const isAtPersonalLimit = viewerPersonalCount >= MAX_PERSONAL_SOUNDS;
  const isAtWorkspaceLimit = workspaceSounds.length >= MAX_WORKSPACE_SOUNDS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin wd-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Usage bar */}
      <div className="flex items-center gap-4">
        <UsageIndicator
          label="Shared"
          count={workspaceSounds.length}
          max={MAX_WORKSPACE_SOUNDS}
        />
        <UsageIndicator
          label="Personal"
          count={viewerPersonalCount}
          max={MAX_PERSONAL_SOUNDS}
        />
      </div>

      {/* Upload form */}
      <SoundboardUploadForm
        workspaceId={workspaceId}
        disabled={isAtWorkspaceLimit && isAtPersonalLimit}
      />

      {/* Workspace sounds */}
      {workspaceSounds.length > 0 && (
        <SoundSection
          icon={<Volume2 size={12} />}
          title="Shared Sounds"
          count={workspaceSounds.length}
        >
          {workspaceSounds.map((sound) => (
            <SoundboardListItem
              key={sound.id}
              sound={sound}
              workspaceId={workspaceId}
              canManage={canManage || sound.uploadedBy === viewerUserId}
            />
          ))}
        </SoundSection>
      )}

      {/* Personal sounds */}
      {personalSounds.length > 0 && (
        <SoundSection
          icon={<Lock size={12} />}
          title="My Sounds"
          count={personalSounds.length}
        >
          {personalSounds.map((sound) => (
            <SoundboardListItem
              key={sound.id}
              sound={sound}
              workspaceId={workspaceId}
              canManage={true}
            />
          ))}
        </SoundSection>
      )}

      {/* Empty state */}
      {workspaceSounds.length === 0 && personalSounds.length === 0 && (
        <div className="flex flex-col items-center py-8 gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
          >
            <Volume2 size={20} className="wd-text-muted" />
          </div>
          <p className="text-sm font-medium wd-text-primary">
            No sounds uploaded yet
          </p>
          <p className="text-xs wd-text-muted text-center max-w-[280px]">
            Upload audio clips to play them during voice calls. Shared sounds
            are available to everyone in this workspace.
          </p>
        </div>
      )}
    </div>
  );
}

function UsageIndicator({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = Math.min((count / max) * 100, 100);
  const isNearLimit = pct >= 80;

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide wd-text-muted">
          {label}
        </span>
        <span
          className="text-[10px] font-medium tabular-nums"
          style={{
            color: isNearLimit ? 'var(--wd-warning)' : 'var(--wd-text-muted)',
          }}
        >
          {count}/{max}
        </span>
      </div>
      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--wd-surface-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: isNearLimit
              ? 'var(--wd-warning)'
              : 'var(--wd-accent)',
          }}
        />
      </div>
    </div>
  );
}

function SoundSection({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: 'var(--wd-border-subtle)',
        backgroundColor: 'var(--wd-surface-panel-2)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--wd-border-subtle)' }}
      >
        <span className="wd-text-muted">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
          {title}
        </span>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums"
          style={{
            backgroundColor: 'var(--wd-surface-elevated)',
            color: 'var(--wd-text-muted)',
          }}
        >
          {count}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto no-scrollbar py-0.5">
        {children}
      </div>
    </div>
  );
}

export default SoundboardTab;
