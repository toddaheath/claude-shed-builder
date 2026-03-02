import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesignApi } from '../useDesignApi';
import { api } from '../../services/api';
import type { Design, BomResponse, DesignVersion } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    listDesigns: vi.fn(),
    getDesign: vi.fn(),
    createDesign: vi.fn(),
    updateDesign: vi.fn(),
    deleteDesign: vi.fn(),
    getBom: vi.fn(),
    listVersions: vi.fn(),
    createVersion: vi.fn(),
    restoreVersion: vi.fn(),
  },
  getStoredToken: vi.fn(() => 'test-token'),
  setStoredToken: vi.fn(),
}));

const mockDesign: Design = {
  id: '1',
  name: 'Test Shed',
  widthFeet: 10,
  widthInches: 0,
  depthFeet: 12,
  depthInches: 0,
  heightFeet: 8,
  heightInches: 0,
  roofPitch: 4,
  roofType: 'Gable',
  openings: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockDesign2: Design = {
  ...mockDesign,
  id: '2',
  name: 'Workshop',
};

describe('useDesignApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listDesigns).mockResolvedValue({ items: [mockDesign, mockDesign2], totalCount: 2 });
  });

  it('loads designs on mount', async () => {
    const { result } = renderHook(() => useDesignApi());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await act(async () => {});

    expect(api.listDesigns).toHaveBeenCalledOnce();
    expect(result.current.designs).toEqual([mockDesign, mockDesign2]);
    expect(result.current.loading).toBe(false);
  });

  it('sets error when loadDesigns fails', async () => {
    vi.mocked(api.listDesigns).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    expect(result.current.error).toBe('Failed to load designs.');
    expect(result.current.loading).toBe(false);
  });

  it('loadDesign sets currentDesign', async () => {
    vi.mocked(api.getDesign).mockResolvedValue(mockDesign);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadDesign('1');
    });

    expect(api.getDesign).toHaveBeenCalledWith('1');
    expect(result.current.currentDesign).toEqual(mockDesign);
  });

  it('loadDesign sets error on failure', async () => {
    vi.mocked(api.getDesign).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadDesign('999');
    });

    expect(result.current.error).toBe('Failed to load design.');
  });

  it('createDesign returns design and refreshes list', async () => {
    const newDesign = { ...mockDesign, id: '3', name: 'New Shed' };
    vi.mocked(api.createDesign).mockResolvedValue(newDesign);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    let created: Design | null = null;
    await act(async () => {
      created = await result.current.createDesign({ name: 'New Shed' });
    });

    expect(created).toEqual(newDesign);
    expect(result.current.currentDesign).toEqual(newDesign);
    // listDesigns called once on mount + once after create
    expect(api.listDesigns).toHaveBeenCalledTimes(2);
  });

  it('createDesign returns null on failure', async () => {
    vi.mocked(api.createDesign).mockRejectedValue(new Error('Validation error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    let created: Design | null = null;
    await act(async () => {
      created = await result.current.createDesign({ name: '' });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBe('Failed to create design.');
  });

  it('updateDesign sets currentDesign', async () => {
    const updated = { ...mockDesign, name: 'Updated Shed' };
    vi.mocked(api.updateDesign).mockResolvedValue(updated);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    let returned: Design | null = null;
    await act(async () => {
      returned = await result.current.updateDesign('1', { name: 'Updated Shed' });
    });

    expect(returned).toEqual(updated);
    expect(result.current.currentDesign).toEqual(updated);
  });

  it('updateDesign returns null on failure', async () => {
    vi.mocked(api.updateDesign).mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    let returned: Design | null = null;
    await act(async () => {
      returned = await result.current.updateDesign('1', { name: 'x' });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Failed to update design.');
  });

  it('deleteDesign clears currentDesign when deleting active design', async () => {
    vi.mocked(api.getDesign).mockResolvedValue(mockDesign);
    vi.mocked(api.deleteDesign).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    // Set current design first
    await act(async () => {
      await result.current.loadDesign('1');
    });
    expect(result.current.currentDesign?.id).toBe('1');

    await act(async () => {
      await result.current.deleteDesign('1');
    });

    expect(result.current.currentDesign).toBeNull();
    expect(api.deleteDesign).toHaveBeenCalledWith('1');
  });

  it('deleteDesign preserves currentDesign when deleting different design', async () => {
    vi.mocked(api.getDesign).mockResolvedValue(mockDesign);
    vi.mocked(api.deleteDesign).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    // Set current design to design 1
    await act(async () => {
      await result.current.loadDesign('1');
    });

    // Delete design 2
    await act(async () => {
      await result.current.deleteDesign('2');
    });

    expect(result.current.currentDesign).toEqual(mockDesign);
  });

  it('deleteDesign sets error on failure', async () => {
    vi.mocked(api.deleteDesign).mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.deleteDesign('1');
    });

    expect(result.current.error).toBe('Failed to delete design.');
  });

  it('loadBom sets bom data', async () => {
    const mockBom: BomResponse = {
      designId: '1',
      items: [{ material: '2x4', dimensions: '8ft', quantity: 10, unit: 'pieces', category: 'Framing' }],
    };
    vi.mocked(api.getBom).mockResolvedValue(mockBom);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadBom('1');
    });

    expect(result.current.bom).toEqual(mockBom);
  });

  it('loadBom sets error on failure', async () => {
    vi.mocked(api.getBom).mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadBom('1');
    });

    expect(result.current.error).toBe('Failed to load bill of materials.');
  });

  it('loadVersions sets versions', async () => {
    const mockVersions: DesignVersion[] = [
      {
        id: 'v1', designId: '1', versionNumber: 1, label: 'Initial',
        widthFeet: 10, widthInches: 0, depthFeet: 12, depthInches: 0,
        heightFeet: 8, heightInches: 0, roofPitch: 4, roofType: 'Gable',
        openings: [], createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(api.listVersions).mockResolvedValue(mockVersions);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadVersions('1');
    });

    expect(result.current.versions).toEqual(mockVersions);
  });

  it('loadVersions sets error on failure', async () => {
    vi.mocked(api.listVersions).mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.loadVersions('1');
    });

    expect(result.current.error).toBe('Failed to load versions.');
  });

  it('createVersion refreshes versions list', async () => {
    vi.mocked(api.createVersion).mockResolvedValue({} as DesignVersion);
    vi.mocked(api.listVersions).mockResolvedValue([]);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.createVersion('1', 'v1');
    });

    expect(api.createVersion).toHaveBeenCalledWith('1', 'v1');
    expect(api.listVersions).toHaveBeenCalledWith('1');
  });

  it('createVersion sets error on failure', async () => {
    vi.mocked(api.createVersion).mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.createVersion('1', 'v1');
    });

    expect(result.current.error).toBe('Failed to save version.');
  });

  it('restoreVersion updates currentDesign', async () => {
    const restored = { ...mockDesign, name: 'Restored Shed' };
    vi.mocked(api.restoreVersion).mockResolvedValue(restored);

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.restoreVersion('1', 'v1');
    });

    expect(result.current.currentDesign).toEqual(restored);
  });

  it('restoreVersion sets error on failure', async () => {
    vi.mocked(api.restoreVersion).mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    await act(async () => {
      await result.current.restoreVersion('1', 'v1');
    });

    expect(result.current.error).toBe('Failed to restore version.');
  });

  it('clearError resets error to null', async () => {
    vi.mocked(api.getDesign).mockRejectedValue(new Error('Fail'));

    const { result } = renderHook(() => useDesignApi());
    await act(async () => {});

    // Trigger an error
    await act(async () => {
      await result.current.loadDesign('1');
    });
    expect(result.current.error).toBe('Failed to load design.');

    // Clear it
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
