import { useEffect, useRef, useState } from 'react';
import type { AwardTagData, DotaAwardTagType } from '@/communication/chatV2/_types';
import type { ChatV2Service } from '@/communication/chatV2/chatV2Service';

export function useAwardTagEditor(
  selectedWorkspaceId: string | null,
  chatV2Service: ChatV2Service,
) {
  const [availableAwards, setAvailableAwards] = useState<AwardTagData[]>([]);
  const [selectedTag, setSelectedTag] = useState<DotaAwardTagType | null>(null);
  const [hideTag, setHideTag] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const opIdRef = useRef(0);

  useEffect(() => {
    if (!selectedWorkspaceId) return;

    // Reset state before fetching for the new workspace
    setAvailableAwards([]);
    setSelectedTag(null);
    setHideTag(false);
    setLoadError(null);

    let cancelled = false;
    void (async () => {
      try {
        const result = await chatV2Service.listMyAwards(selectedWorkspaceId);
        if (cancelled) return;
        setAvailableAwards(result.awards);
        if (result.selectedType !== undefined) setSelectedTag(result.selectedType ?? null);
        if (result.hidden !== undefined) setHideTag(result.hidden ?? false);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load awards');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chatV2Service, selectedWorkspaceId]);

  const handleTagSelect = (type: DotaAwardTagType | null) => {
    if (!selectedWorkspaceId) return;
    const prev = selectedTag;
    const currentOpId = ++opIdRef.current;
    setSelectedTag(type);
    void chatV2Service.updateAwardTagPreference(selectedWorkspaceId, type, hideTag).catch(() => {
      if (opIdRef.current === currentOpId) setSelectedTag(prev);
    });
  };

  const handleToggleHidden = (hidden: boolean) => {
    if (!selectedWorkspaceId) return;
    const prev = hideTag;
    const currentOpId = ++opIdRef.current;
    setHideTag(hidden);
    void chatV2Service.updateAwardTagPreference(selectedWorkspaceId, selectedTag, hidden).catch(() => {
      if (opIdRef.current === currentOpId) setHideTag(prev);
    });
  };

  return {
    availableAwards,
    selectedTag,
    hideTag,
    loadError,
    handleTagSelect,
    handleToggleHidden,
  };
}
