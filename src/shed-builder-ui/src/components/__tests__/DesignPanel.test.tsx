import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DesignPanel from '../DesignPanel';
import type { Design } from '../../types';

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

describe('DesignPanel', () => {
  it('renders design name', () => {
    render(<DesignPanel design={mockDesign} onChange={vi.fn()} saveStatus="idle" />);
    expect(screen.getByDisplayValue('Test Shed')).toBeInTheDocument();
  });

  it('renders save status chip', () => {
    render(<DesignPanel design={mockDesign} onChange={vi.fn()} saveStatus="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('calls onChange when name changes', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    const nameInput = screen.getByDisplayValue('Test Shed');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');

    expect(onChange).toHaveBeenCalled();
  });

  it('renders Add button for openings', () => {
    render(<DesignPanel design={mockDesign} onChange={vi.fn()} saveStatus="idle" />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('adds opening when Add is clicked', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    await userEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ openings: expect.any(Array) })
    );
  });

  it('displays existing openings', () => {
    const designWithOpening = {
      ...mockDesign,
      openings: [{ type: 'Door' as const, wall: 'Front' as const, offsetInches: 24, widthInches: 36, heightInches: 80, sillHeightInches: 0 }],
    };
    render(<DesignPanel design={designWithOpening} onChange={vi.fn()} saveStatus="idle" />);
    expect(screen.getByText('Door #1')).toBeInTheDocument();
  });
});
