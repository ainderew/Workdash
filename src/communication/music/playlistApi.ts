import { CONFIG } from '@/common/utils/config';
import { tokenStore } from '@/common/utils/tokenStore';
import type { PlaylistInfo, PlaylistTrackEntry } from '@/common/store/playlistStore';

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenStore.getJwt()}`,
  };
}

function apiUrl(path: string): string {
  return `${CONFIG.SFU_SERVER_URL}${path}`;
}

interface PlaylistWithTracksResponse {
  playlist: {
    id: string;
    name: string;
    type: 'PERSONAL' | 'WORKSPACE';
    workspaceId: string;
    creatorId: string;
    coverImageUrl: string | null;
    trackCount: number;
    createdAt: string;
    tracks: PlaylistTrackEntry[];
  };
}

export async function fetchPlaylists(
  workspaceId: string,
): Promise<PlaylistInfo[]> {
  const res = await fetch(
    apiUrl(`/api/music/playlists?workspaceId=${encodeURIComponent(workspaceId)}`),
    { headers: authHeaders() },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch playlists: ${res.status}`);
  }
  const data = (await res.json()) as { playlists: PlaylistInfo[] };
  return data.playlists;
}

export async function fetchPlaylistTracks(
  playlistId: string,
): Promise<PlaylistTrackEntry[]> {
  const res = await fetch(
    apiUrl(`/api/music/playlists/${encodeURIComponent(playlistId)}/tracks`),
    { headers: authHeaders() },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist tracks: ${res.status}`);
  }
  const data = (await res.json()) as PlaylistWithTracksResponse;
  return data.playlist.tracks;
}

export async function createPlaylist(data: {
  name: string;
  type: 'PERSONAL' | 'WORKSPACE';
  workspaceId: string;
}): Promise<PlaylistInfo> {
  const res = await fetch(
    apiUrl(`/api/music/playlists?workspaceId=${encodeURIComponent(data.workspaceId)}`),
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: data.name, type: data.type }),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to create playlist: ${res.status}`);
  }
  const result = (await res.json()) as { playlist: PlaylistInfo };
  return result.playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/music/playlists/${encodeURIComponent(playlistId)}`),
    { method: 'DELETE', headers: authHeaders() },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to delete playlist: ${res.status}`);
  }
}

export async function renamePlaylist(
  playlistId: string,
  name: string,
): Promise<PlaylistInfo> {
  const res = await fetch(
    apiUrl(`/api/music/playlists/${encodeURIComponent(playlistId)}`),
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to rename playlist: ${res.status}`);
  }
  const result = (await res.json()) as { playlist: PlaylistInfo };
  return result.playlist;
}

export async function addTrackToPlaylist(
  playlistId: string,
  input: string,
  workspaceId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(
      `/api/music/playlists/${encodeURIComponent(playlistId)}/tracks?workspaceId=${encodeURIComponent(workspaceId)}`,
    ),
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ input }),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to add track: ${res.status}`);
  }
}

export interface TrackSearchResult {
  id: string;
  title: string;
  artist: string | null;
  durationSeconds: number;
  source: 'youtube' | 'soundcloud';
}

export async function searchTracks(
  query: string,
  limit = 8,
): Promise<TrackSearchResult[]> {
  const res = await fetch(
    apiUrl(
      `/api/music/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ),
    { headers: authHeaders() },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { tracks: TrackSearchResult[] };
  return data.tracks;
}

export async function addTrackByIdToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(
      `/api/music/playlists/${encodeURIComponent(playlistId)}/tracks`,
    ),
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ trackId }),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to add track: ${res.status}`);
  }
}

export async function apiReorderTrack(
  playlistId: string,
  trackId: string,
  newPosition: number,
): Promise<void> {
  const res = await fetch(
    apiUrl(
      `/api/music/playlists/${encodeURIComponent(playlistId)}/tracks/reorder`,
    ),
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ trackId, newPosition }),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to reorder track: ${res.status}`);
  }
}

export async function uploadPlaylistCover(
  playlistId: string,
  file: File,
): Promise<PlaylistInfo> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(
    apiUrl(`/api/music/playlists/${encodeURIComponent(playlistId)}/cover`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStore.getJwt()}` },
      body: formData,
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to upload cover: ${res.status}`);
  }
  const result = (await res.json()) as { playlist: PlaylistInfo };
  return result.playlist;
}

export async function removePlaylistCover(
  playlistId: string,
): Promise<PlaylistInfo> {
  const res = await fetch(
    apiUrl(`/api/music/playlists/${encodeURIComponent(playlistId)}/cover`),
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to remove cover: ${res.status}`);
  }
  const result = (await res.json()) as { playlist: PlaylistInfo };
  return result.playlist;
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const res = await fetch(
    apiUrl(
      `/api/music/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
    ),
    { method: 'DELETE', headers: authHeaders() },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to remove track: ${res.status}`);
  }
}
