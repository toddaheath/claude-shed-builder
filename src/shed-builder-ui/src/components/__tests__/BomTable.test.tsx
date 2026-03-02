import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BomTable from '../BomTable';
import type { BomResponse, CostResponse } from '../../types';

vi.mock('../../services/api', () => ({
  api: {
    getCost: vi.fn(),
    downloadPdf: vi.fn(),
    downloadStl: vi.fn(),
  },
}));

import { api } from '../../services/api';
const mockedApi = vi.mocked(api);

const bomData: BomResponse = {
  designId: 'd1',
  items: [
    { material: 'Framing lumber', dimensions: '2×4 × 8\'', quantity: 20, unit: 'pieces', category: 'Walls' },
    { material: 'OSB sheathing', dimensions: '7/16" × 4\' × 8\'', quantity: 8, unit: 'sheets', category: 'Walls' },
    { material: 'Plywood sheathing', dimensions: '3/4" × 4\' × 8\'', quantity: 3, unit: 'sheets', category: 'Floor' },
  ],
};

const costData: CostResponse = {
  designId: 'd1',
  grandTotal: 500.5,
  items: [
    { material: 'Framing lumber', dimensions: '2×4 × 8\'', quantity: 20, unit: 'pieces', category: 'Walls', unitPrice: 5.5, totalPrice: 110 },
    { material: 'OSB sheathing', dimensions: '7/16" × 4\' × 8\'', quantity: 8, unit: 'sheets', category: 'Walls', unitPrice: 28, totalPrice: 224 },
  ],
};

describe('BomTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders BOM-only mode when cost endpoint fails', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    const onLoadBom = vi.fn();

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={onLoadBom} />
    );

    expect(onLoadBom).toHaveBeenCalledWith('d1');
    expect(screen.getByText('Bill of Materials')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Framing lumber')).toBeInTheDocument();
    });

    expect(screen.getByText('Walls')).toBeInTheDocument();
    expect(screen.getByText('Floor')).toBeInTheDocument();
    // No price columns in BOM-only mode
    expect(screen.queryByText('Unit $')).not.toBeInTheDocument();
    expect(screen.queryByText('Grand Total')).not.toBeInTheDocument();
  });

  it('renders cost mode with price columns and grand total', async () => {
    mockedApi.getCost.mockResolvedValue(costData);
    const onLoadBom = vi.fn();

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={onLoadBom} />
    );

    await waitFor(() => {
      expect(screen.getByText('Unit $')).toBeInTheDocument();
    });

    expect(screen.getByText('Total $')).toBeInTheDocument();
    expect(screen.getByText(/Grand Total.*\$500\.50/)).toBeInTheDocument();
  });

  it('shows PDF and STL download buttons', () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('STL')).toBeInTheDocument();
  });

  it('shows error snackbar when PDF download fails', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    mockedApi.downloadPdf.mockRejectedValue(new Error('download failed'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    const pdfButton = screen.getByRole('button', { name: /Download PDF/i });
    await userEvent.click(pdfButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to download PDF.')).toBeInTheDocument();
    });
  });

  it('shows error snackbar when STL download fails', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    mockedApi.downloadStl.mockRejectedValue(new Error('download failed'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    const stlButton = screen.getByRole('button', { name: /Download STL/i });
    await userEvent.click(stlButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to download STL.')).toBeInTheDocument();
    });
  });

  it('calls downloadPdf on successful PDF download', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    mockedApi.downloadPdf.mockResolvedValue(undefined);

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    expect(mockedApi.downloadPdf).toHaveBeenCalledWith('d1', 'Test Shed');
  });

  it('calls downloadStl on successful STL download', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    mockedApi.downloadStl.mockResolvedValue(undefined);

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /Download STL/i }));
    expect(mockedApi.downloadStl).toHaveBeenCalledWith('d1', 'Test Shed');
  });

  it('reloads BOM when designId changes', () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    const onLoadBom = vi.fn();

    const { rerender } = render(
      <BomTable designId="d1" designName="Shed A" bom={bomData} onLoadBom={onLoadBom} />
    );
    expect(onLoadBom).toHaveBeenCalledWith('d1');

    rerender(
      <BomTable designId="d2" designName="Shed B" bom={bomData} onLoadBom={onLoadBom} />
    );
    expect(onLoadBom).toHaveBeenCalledWith('d2');
    expect(onLoadBom).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when bom is null', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={null} onLoadBom={vi.fn()} />
    );

    expect(screen.getByText('Bill of Materials')).toBeInTheDocument();
    // No category sections should appear
    expect(screen.queryByText('Walls')).not.toBeInTheDocument();
    expect(screen.queryByText('Floor')).not.toBeInTheDocument();
  });

  it('groups items by category', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Walls')).toBeInTheDocument();
    });
    expect(screen.getByText('Floor')).toBeInTheDocument();
  });

  it('shows CSV export button', () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('disables CSV button when no items', () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));

    render(
      <BomTable designId="d1" designName="Test Shed" bom={null} onLoadBom={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });

  it('creates CSV download when clicked', async () => {
    mockedApi.getCost.mockRejectedValue(new Error('fail'));
    const clickMock = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement');
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockAnchor = { href: '', download: '', click: clickMock } as unknown as HTMLAnchorElement;
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return origCreateElement(tag);
    });

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(clickMock).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('Test Shed-bom.csv');
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('includes cost columns in CSV when cost data is available', async () => {
    mockedApi.getCost.mockResolvedValue(costData);
    let capturedBlob: Blob | null = null;
    const clickMock = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement');
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:test';
    });
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mockAnchor = { href: '', download: '', click: clickMock } as unknown as HTMLAnchorElement;
    createElementSpy.mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return origCreateElement(tag);
    });

    render(
      <BomTable designId="d1" designName="Test Shed" bom={bomData} onLoadBom={vi.fn()} />
    );

    // Wait for cost data to load
    await waitFor(() => {
      expect(screen.getByText('Unit $')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    expect(capturedBlob).not.toBeNull();
    const text = await capturedBlob!.text();
    expect(text).toContain('Unit $');
    expect(text).toContain('Total $');
    expect(text).toContain('Grand Total');

    createElementSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
