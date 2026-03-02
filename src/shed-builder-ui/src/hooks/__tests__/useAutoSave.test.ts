import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import { api } from '../../services/api';
import type { Design } from '../../types';

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
    vi.mocked(api.updateDesign).mockResolvedValue({} as Design);
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
    renderHook(() => useAutoSave('design-1', data));

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
      () => new Promise<Design>((resolve) => { resolveUpdate = () => resolve({} as Design); })
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

  it('resets status to idle when designId changes', async () => {
    let resolveUpdate: () => void;
    vi.mocked(api.updateDesign).mockImplementation(
      () => new Promise<Design>((resolve) => { resolveUpdate = () => resolve({} as Design); })
    );

    const data = { name: 'Test' };
    const { result, rerender } = renderHook(
      ({ id, d }) => useAutoSave(id, d),
      { initialProps: { id: 'design-1', d: data } }
    );

    // Trigger save and reach 'saved' state
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    await act(async () => {
      resolveUpdate!();
    });
    expect(result.current).toBe('saved');

    // Change designId — status should reset to idle
    rerender({ id: 'design-2', d: data });
    expect(result.current).toBe('idle');
  });

  it('does not save when designId is null', async () => {
    vi.mocked(api.updateDesign).mockClear();

    renderHook(() => useAutoSave(null, { name: 'Test' }));

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(api.updateDesign).not.toHaveBeenCalled();
  });

  it('saves again when data changes', async () => {
    vi.mocked(api.updateDesign).mockClear();

    const { rerender } = renderHook(
      ({ id, d }) => useAutoSave(id, d),
      { initialProps: { id: 'design-1', d: { name: 'First' } } }
    );

    // First save
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(api.updateDesign).toHaveBeenCalledTimes(1);
    expect(api.updateDesign).toHaveBeenCalledWith('design-1', { name: 'First' });

    // Change data
    rerender({ id: 'design-1', d: { name: 'Second' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(api.updateDesign).toHaveBeenCalledTimes(2);
    expect(api.updateDesign).toHaveBeenLastCalledWith('design-1', { name: 'Second' });
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
