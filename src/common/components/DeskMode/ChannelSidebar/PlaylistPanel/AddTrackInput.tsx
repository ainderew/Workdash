import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, HardDrive, Download } from 'lucide-react';
import { searchTracks } from '@/communication/music/playlistApi';
import type { TrackSearchResult } from '@/communication/music/playlistApi';
import { formatDuration } from '@/common/utils/formatDuration';

interface AddTrackInputProps {
  playlistId: string;
  onAddTrack: (playlistId: string, input: string) => Promise<void>;
  onAddTrackById?: (playlistId: string, trackId: string) => Promise<void>;
}

function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

export function AddTrackInput({
  playlistId,
  onAddTrack,
  onAddTrackById,
}: AddTrackInputProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TrackSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2 || isUrl(query)) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const results = await searchTracks(query);
    setSuggestions(results);
    setShowDropdown(results.length > 0);
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2 || isUrl(trimmed)) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(trimmed);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setShowDropdown(false);
    try {
      await onAddTrack(playlistId, trimmed);
      setValue('');
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add track');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = async (track: TrackSearchResult) => {
    setShowDropdown(false);
    setSuggestions([]);
    setLoading(true);
    setError(null);
    try {
      if (onAddTrackById) {
        await onAddTrackById(playlistId, track.id);
      } else {
        await onAddTrack(playlistId, track.title);
      }
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add track');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        void handleSelectSuggestion(suggestions[selectedIndex]!);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setSelectedIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const trimmed = value.trim();
  const showDownloadHint =
    trimmed.length >= 2 && !isUrl(trimmed) && suggestions.length === 0 && !showDropdown;

  return (
    <div className="px-3 pb-2.5 relative" ref={containerRef}>
      {/* Search input — Apple Music style rounded pill */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 wd-text-muted pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder="Search or paste URL"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--wd-surface-base)] pl-8 pr-3 py-2 text-[13px] wd-text-primary placeholder:wd-text-muted focus:outline-none focus:ring-1 focus:ring-[var(--wd-accent)] disabled:opacity-60 transition-shadow"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--wd-accent)]/30 border-t-[var(--wd-accent)]" />
        )}
      </div>

      {/* Search suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute left-3 right-3 z-10 mt-1.5 max-h-52 overflow-y-auto rounded-lg border wd-border-subtle bg-[var(--wd-surface-elevated)] shadow-lg wd-playlist-enter">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider wd-text-muted font-medium">
            On disk
          </div>
          {suggestions.map((track, index) => (
            <button
              key={track.id}
              type="button"
              onClick={() => void handleSelectSuggestion(track)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-[var(--wd-accent-soft)]'
                  : 'hover:bg-[var(--wd-surface-base)]'
              }`}
            >
              <HardDrive
                size={12}
                className="shrink-0 text-[var(--wd-success)]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] wd-text-primary truncate">
                  {track.title}
                </p>
                <p className="text-[11px] wd-text-muted truncate">
                  {track.artist ? `${track.artist} · ` : ''}
                  {formatDuration(track.durationSeconds)}
                </p>
              </div>
            </button>
          ))}
          {trimmed && (
            <button
              type="button"
              onClick={handleSubmit}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left border-t wd-border-subtle transition-colors ${
                selectedIndex === suggestions.length
                  ? 'bg-[var(--wd-accent-soft)]'
                  : 'hover:bg-[var(--wd-surface-base)]'
              }`}
            >
              <Download
                size={12}
                className="shrink-0 text-[var(--wd-info)]"
              />
              <p className="text-[13px] wd-text-secondary truncate">
                Search &amp; download &ldquo;{trimmed}&rdquo;
              </p>
            </button>
          )}
        </div>
      )}

      {/* Hint when no on-disk matches */}
      {showDownloadHint && !loading && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1">
          <Download size={10} className="text-[var(--wd-info)]" />
          <p className="text-[11px] wd-text-muted">
            No local matches — press Enter to search &amp; download
          </p>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[11px] text-[var(--wd-danger)] px-1">{error}</p>
      )}
    </div>
  );
}
