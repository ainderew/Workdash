import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ImagePlus,
  ListMusic,
  MoreHorizontal,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Shuffle,
  Trash2,
  ImageOff,
  Lock,
  Users,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import useUserStore from '@/common/store/useStore';
import usePlaylistStore from '@/common/store/playlistStore';
import useMusicStore from '@/common/store/musicStore';
import { MusicClientService } from '@/communication/music/musicService';
import { usePlaylist } from './usePlaylist';
import { PlaylistItem } from './PlaylistItem';
import { PlaylistTrackItem } from './PlaylistTrackItem';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { AddTrackInput } from './AddTrackInput';
import { DownloadProgress } from './DownloadProgress';
import { MiniPlayer } from './MiniPlayer';
import type { PlaylistInfo } from '@/common/store/playlistStore';

interface PlaylistPanelProps {
  workspaceId: string | null;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function PlaylistPanel({ workspaceId }: PlaylistPanelProps) {
  const userId = useUserStore((state) => state.backendUser?.id ?? null);
  const {
    playlists,
    playlistsLoading,
    activePlaylist,
    activePlaylistTracks,
    activePlaylistLoading,
    downloadProgress,
    selectPlaylist,
    backToList,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrack,
    addTrackById,
    removeTrack,
    reorderTrack,
    playTrack,
    addToQueue,
    playAll,
    uploadCoverImage,
    removeCoverImage,
    refetchPlaylists,
  } = usePlaylist(workspaceId);

  const musicSession = useMusicStore((s) =>
    workspaceId ? s.sessionsByWorkspace[workspaceId] ?? null : null,
  );
  const playingTrackTitle = musicSession?.state === 'playing' ? musicSession.currentTrack?.title ?? null : null;
  const pausedTrackTitle = musicSession?.state === 'paused' ? musicSession.currentTrack?.title ?? null : null;

  const togglePlayback = useCallback(() => {
    if (!workspaceId) return;
    MusicClientService.getInstance().togglePlayback(workspaceId);
  }, [workspaceId]);

  const skipTrack = useCallback(() => {
    if (!workspaceId) return;
    MusicClientService.getInstance().skip(workspaceId);
  }, [workspaceId]);

  const hasSession = musicSession !== null;
  const isSessionPlaying = musicSession?.state === 'playing';
  const isSessionPaused = musicSession?.state === 'paused';
  const hasQueue = (musicSession?.queueLength ?? 0) > 0;
  const isShuffle = musicSession?.shuffle ?? false;

  const toggleShuffle = useCallback(() => {
    if (!workspaceId) return;
    MusicClientService.getInstance().emitSetShuffle(workspaceId, !isShuffle);
  }, [workspaceId, isShuffle]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setOverId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      setOverId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = activePlaylistTracks.findIndex((t) => t.id === String(active.id));
      const newIndex = activePlaylistTracks.findIndex((t) => t.id === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      void reorderTrack(oldIndex, newIndex);
    },
    [activePlaylistTracks, reorderTrack],
  );

  const draggedEntry = activeDragId
    ? activePlaylistTracks.find((t) => t.id === activeDragId)
    : undefined;

  // Determine insertion line position: 'above' or 'below' the over item
  const insertDirection = (() => {
    if (!activeDragId || !overId || activeDragId === overId) return null;
    const activeIdx = activePlaylistTracks.findIndex((t) => t.id === activeDragId);
    const overIdx = activePlaylistTracks.findIndex((t) => t.id === overId);
    if (activeIdx === -1 || overIdx === -1) return null;
    return activeIdx < overIdx ? 'below' : 'above';
  })();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'rename'>('create');
  const [renameTarget, setRenameTarget] = useState<PlaylistInfo | undefined>();
  const [menuPlaylistId, setMenuPlaylistId] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const playlistId = usePlaylistStore.getState().activePlaylistId;
      if (!file || !playlistId) return;
      void uploadCoverImage(playlistId, file);
      e.target.value = '';
    },
    [uploadCoverImage],
  );

  const openCreate = () => {
    setDialogMode('create');
    setRenameTarget(undefined);
    setDialogOpen(true);
  };

  const openRename = (playlist: PlaylistInfo) => {
    setDialogMode('rename');
    setRenameTarget(playlist);
    setDialogOpen(true);
    setMenuPlaylistId(null);
  };

  const handleDelete = async (id: string) => {
    setMenuPlaylistId(null);
    try {
      await deletePlaylist(id);
    } catch (err) {
      console.warn('[playlist] Failed to delete playlist:', err instanceof Error ? err.message : String(err));
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-[13px] wd-text-muted">No workspace selected</p>
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────
  if (activePlaylist) {
    const isCreator = userId !== null && String(userId) === activePlaylist.creatorId;
    const isWorkspace = activePlaylist.type === 'WORKSPACE';
    const canEditCover = isCreator || isWorkspace;
    const hue = nameToHue(activePlaylist.name);

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {downloadProgress && <DownloadProgress progress={downloadProgress} />}

        {/* Detail header — Apple Music inspired with gradient accent */}
        <div className="relative">
          {/* Subtle gradient background */}
          <div
            className="absolute inset-0 opacity-[0.08] overflow-hidden"
            style={{
              background: `linear-gradient(180deg, oklch(0.65 0.18 ${hue}), transparent)`,
            }}
          />

          <div className="relative px-3.5 pt-3 pb-3">
            {/* Back + actions row */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={backToList}
                aria-label="Back to playlists"
                className="flex items-center gap-1 text-[var(--wd-accent)] text-[13px] font-medium transition-opacity hover:opacity-80"
              >
                <ArrowLeft size={15} />
                <span>Library</span>
              </button>
              {isCreator && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuPlaylistId(
                        menuPlaylistId === activePlaylist.id
                          ? null
                          : activePlaylist.id,
                      )
                    }
                    aria-label="Playlist options"
                    className="p-1 rounded-full wd-text-muted hover:wd-text-primary hover:bg-[var(--wd-surface-base)] transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuPlaylistId === activePlaylist.id && (
                    <PlaylistMenu
                      onRename={() => openRename(activePlaylist)}
                      onDelete={() => void handleDelete(activePlaylist.id)}
                      onChangeCover={() => {
                        setMenuPlaylistId(null);
                        coverInputRef.current?.click();
                      }}
                      onRemoveCover={() => {
                        setMenuPlaylistId(null);
                        void removeCoverImage(activePlaylist.id);
                      }}
                      hasCover={!!activePlaylist.coverImageUrl}
                      onDismiss={() => setMenuPlaylistId(null)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Playlist artwork + info */}
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                disabled={!canEditCover}
                onClick={() => canEditCover && coverInputRef.current?.click()}
                className="group/cover relative shrink-0 h-14 w-14 rounded-xl shadow-md overflow-hidden"
                title={canEditCover ? 'Change cover image' : undefined}
              >
                {activePlaylist.coverImageUrl ? (
                  <Image
                    src={activePlaylist.coverImageUrl}
                    alt={activePlaylist.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.65 0.18 ${hue}), oklch(0.50 0.15 ${hue + 40}))`,
                    }}
                  >
                    {activePlaylist.type === 'PERSONAL' ? (
                      <Lock size={22} className="text-white/70" />
                    ) : (
                      <Users size={22} className="text-white/70" />
                    )}
                  </div>
                )}
                {canEditCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity">
                    <ImagePlus size={16} className="text-white" />
                  </div>
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-[15px] font-bold wd-text-primary truncate leading-tight">
                  {activePlaylist.name}
                </h3>
                <p className="text-[11px] wd-text-muted mt-0.5">
                  {activePlaylist.type === 'PERSONAL' ? 'Personal Playlist' : 'Shared Playlist'}
                </p>
                <p className="text-[11px] wd-text-muted tabular-nums">
                  {activePlaylistTracks.length} {activePlaylistTracks.length === 1 ? 'song' : 'songs'}
                </p>
              </div>
            </div>

            {/* Play & Shuffle controls */}
            {activePlaylistTracks.length > 0 && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={isSessionPlaying ? togglePlayback : () => playAll(activePlaylist.name)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--wd-accent)] py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-[var(--wd-accent-hover)] active:scale-[0.97]"
                >
                  {isSessionPlaying ? (
                    <>
                      <Pause size={15} fill="currentColor" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={15} fill="currentColor" />
                      {isSessionPaused ? 'Resume' : 'Play'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold transition-all active:scale-[0.97] ${
                    isShuffle
                      ? 'text-[var(--wd-accent)] bg-[var(--wd-accent-soft)]'
                      : 'wd-text-secondary bg-[var(--wd-surface-base)]'
                  }`}
                >
                  <Shuffle size={15} />
                  Shuffle
                </button>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-[var(--wd-border-subtle)]" />
        </div>

        {/* Add track input */}
        <div className="pt-2.5">
          <AddTrackInput
            playlistId={activePlaylist.id}
            onAddTrack={addTrack}
            onAddTrackById={addTrackById}
          />
        </div>

        {/* Track list */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {activePlaylistLoading ? (
            <TrackListSkeleton />
          ) : activePlaylistTracks.length === 0 ? (
            <EmptyTrackList />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={activePlaylistTracks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {activePlaylistTracks.map((entry, i) => (
                  <PlaylistTrackItem
                    key={entry.id}
                    entry={entry}
                    sortableId={entry.id}
                    index={i}
                    canRemove={isCreator || isWorkspace}
                    onRemove={() => void removeTrack(activePlaylist.id, entry.track.id)}
                    onPlayTrack={playTrack}
                    onTogglePlayback={togglePlayback}
                    onAddToQueue={addToQueue}
                    isPlaying={playingTrackTitle === entry.track.title}
                    isPaused={pausedTrackTitle === entry.track.title}
                    insertIndicator={
                      overId === entry.id && insertDirection
                        ? insertDirection
                        : null
                    }
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {draggedEntry ? (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--wd-surface-elevated)] border border-[var(--wd-border-subtle)] shadow-lg opacity-80">
                    <Music size={13} className="shrink-0 wd-text-muted" />
                    <p className="text-[13px] font-medium wd-text-primary truncate">
                      {draggedEntry.track.title}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Mini player */}
        {hasSession && musicSession && (
          <MiniPlayer
            session={musicSession}
            workspaceId={workspaceId}
            hue={hue}
            coverImageUrl={activePlaylist.coverImageUrl}
            hasQueue={hasQueue}
            onTogglePlayback={togglePlayback}
            onSkip={skipTrack}
          />
        )}

        <CreatePlaylistDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          mode={dialogMode}
          existingPlaylist={renameTarget}
          onCreate={createPlaylist}
          onRename={renamePlaylist}
        />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────
  const personalPlaylists = playlists
    .filter((p) => p.type === 'PERSONAL')
    .sort((a, b) => a.name.localeCompare(b.name));
  const sharedPlaylists = playlists
    .filter((p) => p.type === 'WORKSPACE')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {downloadProgress && <DownloadProgress progress={downloadProgress} />}

      {/* List header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <h4 className="text-[13px] font-semibold wd-text-primary">
          Your Library
        </h4>
        <button
          type="button"
          onClick={openCreate}
          aria-label="Create playlist"
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--wd-accent)] bg-[var(--wd-accent-soft)] transition-colors hover:bg-[var(--wd-accent-soft)] hover:brightness-110"
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Playlist list */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {playlistsLoading ? (
          <PlaylistListSkeleton />
        ) : playlists.length === 0 ? (
          <EmptyPlaylistList onCreateClick={openCreate} />
        ) : (
          <>
            {personalPlaylists.length > 0 && (
              <PlaylistSection
                title="Your Playlists"
                playlists={personalPlaylists}
                activePlaylistId={null}
                onSelect={selectPlaylist}
              />
            )}
            {sharedPlaylists.length > 0 && (
              <PlaylistSection
                title="Shared"
                playlists={sharedPlaylists}
                activePlaylistId={null}
                onSelect={selectPlaylist}
              />
            )}
          </>
        )}
      </div>

      {/* Retry on error */}
      {!playlistsLoading && playlists.length === 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => void refetchPlaylists()}
            className="w-full text-[11px] text-[var(--wd-accent)] hover:underline text-center py-1"
          >
            Retry
          </button>
        </div>
      )}

      <CreatePlaylistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        existingPlaylist={renameTarget}
        onCreate={createPlaylist}
        onRename={renamePlaylist}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function PlaylistSection({
  title,
  playlists,
  activePlaylistId,
  onSelect,
}: {
  title: string;
  playlists: PlaylistInfo[];
  activePlaylistId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-1">
      <div className="px-3.5 py-1.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider wd-text-muted">
          {title}
        </h4>
      </div>
      {playlists.map((playlist) => (
        <PlaylistItem
          key={playlist.id}
          playlist={playlist}
          isActive={playlist.id === activePlaylistId}
          onClick={() => onSelect(playlist.id)}
        />
      ))}
    </div>
  );
}

function PlaylistMenu({
  onRename,
  onDelete,
  onChangeCover,
  onRemoveCover,
  hasCover,
  onDismiss,
}: {
  onRename: () => void;
  onDelete: () => void;
  onChangeCover: () => void;
  onRemoveCover: () => void;
  hasCover: boolean;
  onDismiss: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onDismiss} />
      <div className="absolute right-0 top-full z-[101] mt-1 w-40 rounded-xl border wd-border-subtle bg-[var(--wd-surface-elevated)] py-1.5 shadow-lg wd-playlist-enter">
        <button
          type="button"
          onClick={onRename}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] wd-text-secondary hover:bg-[var(--wd-surface-base)] transition-colors"
        >
          <Pencil size={13} />
          Rename
        </button>
        <button
          type="button"
          onClick={onChangeCover}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] wd-text-secondary hover:bg-[var(--wd-surface-base)] transition-colors"
        >
          <ImagePlus size={13} />
          Change Cover
        </button>
        {hasCover && (
          <button
            type="button"
            onClick={onRemoveCover}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] wd-text-secondary hover:bg-[var(--wd-surface-base)] transition-colors"
          >
            <ImageOff size={13} />
            Remove Cover
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[var(--wd-danger)] hover:bg-[var(--wd-surface-base)] transition-colors"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </>
  );
}

function EmptyPlaylistList({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wd-accent-soft)]">
        <ListMusic size={24} className="text-[var(--wd-accent)]" />
      </div>
      <p className="text-[15px] font-semibold wd-text-primary mb-1">Start your library</p>
      <p className="text-[13px] wd-text-muted mb-4 max-w-[200px] leading-relaxed">
        Create a playlist to organize and share music with your team.
      </p>
      <button
        type="button"
        onClick={onCreateClick}
        className="flex items-center gap-1.5 rounded-full bg-[var(--wd-accent)] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[var(--wd-accent-hover)] active:scale-[0.97]"
      >
        <Plus size={14} />
        Create Playlist
      </button>
    </div>
  );
}

function EmptyTrackList() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wd-surface-base)]">
        <Music size={20} className="wd-text-muted" />
      </div>
      <p className="text-[13px] font-semibold wd-text-secondary mb-1">No songs yet</p>
      <p className="text-[11px] wd-text-muted max-w-[200px] leading-relaxed">
        Search for a song or paste a URL to add your first track.
      </p>
    </div>
  );
}

function PlaylistListSkeleton() {
  return (
    <div className="space-y-1 px-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="h-10 w-10 rounded-lg bg-[var(--wd-surface-elevated)] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
            <div className="h-2.5 w-16 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackListSkeleton() {
  return (
    <div className="px-1 pt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-7 flex justify-center">
            <div className="h-3 w-3 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
          </div>
          <div className="h-3 w-8 rounded bg-[var(--wd-surface-elevated)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
