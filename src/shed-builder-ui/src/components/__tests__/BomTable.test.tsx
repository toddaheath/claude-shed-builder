import { render, screen, waitFor } from '@testing-library/react';
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
});
