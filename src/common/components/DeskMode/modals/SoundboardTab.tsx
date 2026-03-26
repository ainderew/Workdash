import React from 'react';
import { Loader2 } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="text-xs wd-text-muted">
        {workspaceSounds.length}/{MAX_WORKSPACE_SOUNDS} workspace sounds
        <span className="ml-2">
          &middot; {viewerPersonalCount}/{MAX_PERSONAL_SOUNDS} personal sounds
        </span>
      </div>

      <SoundboardUploadForm
        workspaceId={workspaceId}
        disabled={isAtWorkspaceLimit && isAtPersonalLimit}
      />

      {workspaceSounds.length > 0 && (
        <div className="rounded-lg border wd-border-subtle wd-bg-panel-2">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
            Workspace Sounds
          </p>
          <div className="max-h-64 overflow-y-auto p-1">
            {workspaceSounds.map((sound) => (
              <SoundboardListItem
                key={sound.id}
                sound={sound}
                workspaceId={workspaceId}
                canManage={canManage || sound.uploadedBy === viewerUserId}
              />
            ))}
          </div>
        </div>
      )}

      {personalSounds.length > 0 && (
        <div className="rounded-lg border wd-border-subtle wd-bg-panel-2">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide wd-text-muted">
            My Sounds
          </p>
          <div className="max-h-64 overflow-y-auto p-1">
            {personalSounds.map((sound) => (
              <SoundboardListItem
                key={sound.id}
                sound={sound}
                workspaceId={workspaceId}
                canManage={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SoundboardTab;
