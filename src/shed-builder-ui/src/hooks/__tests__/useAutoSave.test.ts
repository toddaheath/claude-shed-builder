import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    updateDesign: vi.fn(),
  },
  getStoredToken: vi.fn(() => 'test-token'),
  setStoredToken: vi.fn(),
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.updateDesign).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts with idle status', () => {
    const { result } = renderHook(() => useAutoSave(null, null));
    expect(result.current).toBe('idle');
  });

  it('debounces save by 1500ms', async () => {
    const data = { name: 'Test' };
    const { result } = renderHook(() => useAutoSave('design-1', data));

    // Before debounce fires
    expect(api.updateDesign).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(api.updateDesign).toHaveBeenCalledWith('design-1', data);
  });

  it('transitions through saving and saved states', async () => {
    let resolveUpdate: () => void;
    vi.mocked(api.updateDesign).mockImplementation(
      () => new Promise<any>((resolve) => { resolveUpdate = () => resolve({} as any); })
    );

    const data = { name: 'Test' };
    const { result } = renderHook(() => useAutoSave('design-1', data));

    // Trigger debounce
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current).toBe('saving');

    // Resolve the save
    await act(async () => {
      resolveUpdate!();
    });
    expect(result.current).toBe('saved');

    // After 2 seconds, returns to idle
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe('idle');
  });

  it('shows error status on save failure', async () => {
    vi.mocked(api.updateDesign).mockRejectedValue(new Error('Network error'));

    const data = { name: 'Test' };
    const { result } = renderHook(() => useAutoSave('design-1', data));

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current).toBe('error');
  });

  it('does not re-save on identical data', async () => {
    vi.mocked(api.updateDesign).mockClear();

    const data = { name: 'Unique' };
    const { rerender } = renderHook(
      ({ id, d }) => useAutoSave(id, d),
      { initialProps: { id: 'design-unique', d: data } }
    );

    // First save
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(api.updateDesign).toHaveBeenCalledTimes(1);

    // Re-render with identical data (same JSON)
    rerender({ id: 'design-unique', d: { name: 'Unique' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    // Should not have saved again since serialized data is identical
    expect(api.updateDesign).toHaveBeenCalledTimes(1);
  });
});
