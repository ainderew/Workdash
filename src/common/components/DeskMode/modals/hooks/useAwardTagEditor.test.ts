import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAwardTagEditor } from './useAwardTagEditor';
import type { ChatV2Service } from '@/communication/chatV2/chatV2Service';
import type { AwardTagData } from '@/communication/chatV2/_types';

const MVP_AWARD: AwardTagData = { type: 'MVP', label: 'MVP' };
const HOT_HAND_AWARD: AwardTagData = { type: 'HOT_HAND', label: 'Hot Hand' };

const mockService = {
  listMyAwards: vi.fn(),
  updateAwardTagPreference: vi.fn(),
};

function svc() {
  return mockService as unknown as ChatV2Service;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockService.updateAwardTagPreference.mockResolvedValue(undefined);
});

describe('useAwardTagEditor', () => {
  it('fetches and populates awards on mount', async () => {
    mockService.listMyAwards.mockResolvedValue({
      awards: [MVP_AWARD, HOT_HAND_AWARD],
      selectedType: 'MVP',
      hidden: true,
    });

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));

    await waitFor(() => {
      expect(result.current.availableAwards).toEqual([MVP_AWARD, HOT_HAND_AWARD]);
    });
    expect(result.current.selectedTag).toBe('MVP');
    expect(result.current.hideTag).toBe(true);
    expect(mockService.listMyAwards).toHaveBeenCalledWith('ws-1');
  });

  it('does not call listMyAwards when workspaceId is null', () => {
    renderHook(() => useAwardTagEditor(null, svc()));
    expect(mockService.listMyAwards).not.toHaveBeenCalled();
  });

  it('sets loadError when listMyAwards rejects', async () => {
    mockService.listMyAwards.mockRejectedValue(new Error('Dota not linked'));

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));

    await waitFor(() => {
      expect(result.current.loadError).toBe('Dota not linked');
    });
    expect(result.current.availableAwards).toEqual([]);
  });

  it('handleTagSelect optimistically updates and calls service with workspaceId', async () => {
    mockService.listMyAwards.mockResolvedValue({ awards: [MVP_AWARD], selectedType: null, hidden: false });

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    await waitFor(() => expect(result.current.availableAwards).toHaveLength(1));

    act(() => { result.current.handleTagSelect('MVP'); });

    expect(result.current.selectedTag).toBe('MVP');
    expect(mockService.updateAwardTagPreference).toHaveBeenCalledWith('ws-1', 'MVP', false);
  });

  it('handleTagSelect rolls back on failure', async () => {
    mockService.listMyAwards.mockResolvedValue({ awards: [MVP_AWARD], selectedType: 'HOT_HAND', hidden: false });
    mockService.updateAwardTagPreference.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    await waitFor(() => expect(result.current.selectedTag).toBe('HOT_HAND'));

    act(() => { result.current.handleTagSelect('MVP'); });
    expect(result.current.selectedTag).toBe('MVP');

    await waitFor(() => expect(result.current.selectedTag).toBe('HOT_HAND'));
  });

  it('handleToggleHidden optimistically updates and calls service with workspaceId', async () => {
    mockService.listMyAwards.mockResolvedValue({ awards: [MVP_AWARD], selectedType: 'MVP', hidden: false });

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    await waitFor(() => expect(result.current.selectedTag).toBe('MVP'));

    act(() => { result.current.handleToggleHidden(true); });

    expect(result.current.hideTag).toBe(true);
    expect(mockService.updateAwardTagPreference).toHaveBeenCalledWith('ws-1', 'MVP', true);
  });

  it('handleToggleHidden rolls back on failure', async () => {
    mockService.listMyAwards.mockResolvedValue({ awards: [MVP_AWARD], selectedType: null, hidden: false });
    mockService.updateAwardTagPreference.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    await waitFor(() => expect(result.current.availableAwards).toHaveLength(1));

    act(() => { result.current.handleToggleHidden(true); });
    expect(result.current.hideTag).toBe(true);

    await waitFor(() => expect(result.current.hideTag).toBe(false));
  });

  it('stale rollback is suppressed when a newer operation started (race protection)', async () => {
    mockService.listMyAwards.mockResolvedValue({ awards: [MVP_AWARD, HOT_HAND_AWARD], selectedType: null, hidden: false });

    let rejectFirst!: (err: Error) => void;
    mockService.updateAwardTagPreference
      .mockReturnValueOnce(new Promise((_, reject) => { rejectFirst = reject; }))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    await waitFor(() => expect(result.current.availableAwards).toHaveLength(2));

    act(() => { result.current.handleTagSelect('MVP'); });
    act(() => { result.current.handleTagSelect('HOT_HAND'); });

    await act(async () => {
      rejectFirst(new Error('timeout'));
      await Promise.resolve();
    });

    // Should NOT roll back to null — HOT_HAND is the latest operation
    expect(result.current.selectedTag).toBe('HOT_HAND');
  });

  it('does not update state after unmount', async () => {
    let resolveList!: (value: unknown) => void;
    mockService.listMyAwards.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));

    const { result, unmount } = renderHook(() => useAwardTagEditor('ws-1', svc()));
    unmount();

    await act(async () => {
      resolveList({ awards: [MVP_AWARD], selectedType: 'MVP', hidden: true });
      await Promise.resolve();
    });

    expect(result.current.availableAwards).toEqual([]);
  });
});
