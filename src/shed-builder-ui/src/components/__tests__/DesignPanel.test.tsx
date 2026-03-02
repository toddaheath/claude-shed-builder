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

  it('removes opening when delete button is clicked', async () => {
    const onChange = vi.fn();
    const designWithOpening = {
      ...mockDesign,
      openings: [
        { type: 'Door' as const, wall: 'Front' as const, offsetInches: 24, widthInches: 36, heightInches: 80, sillHeightInches: 0 },
        { type: 'Window' as const, wall: 'Left' as const, offsetInches: 12, widthInches: 36, heightInches: 36, sillHeightInches: 36 },
      ],
    };
    render(<DesignPanel design={designWithOpening} onChange={onChange} saveStatus="idle" />);

    // Click remove on the first opening (Door #1)
    await userEvent.click(screen.getByLabelText('Remove Door #1'));
    expect(onChange).toHaveBeenCalledWith({
      openings: [designWithOpening.openings[1]],
    });
  });

  it('calls onChange with widthFeet when width feet input is modified', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    const widthFeetInput = screen.getByRole('spinbutton', { name: 'Width feet' });
    await userEvent.type(widthFeetInput, '2');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ widthFeet: expect.any(Number) }));
  });

  it('calls onChange with depthInches when depth inches input is modified', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    const depthInchesInput = screen.getByRole('spinbutton', { name: 'Depth inches' });
    await userEvent.type(depthInchesInput, '6');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ depthInches: expect.any(Number) }));
  });

  it('calls onChange when roof pitch is changed', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    const pitchInput = screen.getByRole('spinbutton', { name: /roof pitch/i });
    await userEvent.clear(pitchInput);
    await userEvent.type(pitchInput, '6');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ roofPitch: expect.any(Number) }));
  });

  it('renders with LeanTo roof design', () => {
    const leanToDesign = { ...mockDesign, roofType: 'LeanTo' as const };
    render(<DesignPanel design={leanToDesign} onChange={vi.fn()} saveStatus="idle" />);
    expect(screen.getByDisplayValue('Test Shed')).toBeInTheDocument();
  });

  it('calls onChange when height feet is changed', async () => {
    const onChange = vi.fn();
    render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

    const heightInput = screen.getByRole('spinbutton', { name: 'Wall height feet' });
    await userEvent.type(heightInput, '0');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ heightFeet: expect.any(Number) }));
  });

  it('shows all save statuses correctly', () => {
    const statuses = ['idle', 'saving', 'saved', 'error'] as const;
    const labels = ['Ready', 'Saving...', 'Saved', 'Error saving'];

    statuses.forEach((status, i) => {
      const { unmount } = render(
        <DesignPanel design={mockDesign} onChange={vi.fn()} saveStatus={status} />
      );
      expect(screen.getByText(labels[i])).toBeInTheDocument();
      unmount();
    });
  });

  describe('opening field changes', () => {
    const designWithOpening: Design = {
      ...mockDesign,
      openings: [
        { type: 'Door', wall: 'Front', offsetInches: 24, widthInches: 36, heightInches: 80, sillHeightInches: 0 },
      ],
    };

    it('calls onChange when opening width is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={designWithOpening} onChange={onChange} saveStatus="idle" />);

      const widthInput = screen.getByRole('spinbutton', { name: 'Width (in)' });
      await userEvent.type(widthInput, '4');

      expect(onChange).toHaveBeenCalledWith({
        openings: [expect.objectContaining({ widthInches: expect.any(Number) })],
      });
    });

    it('calls onChange when opening height is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={designWithOpening} onChange={onChange} saveStatus="idle" />);

      const heightInput = screen.getByRole('spinbutton', { name: 'Height (in)' });
      await userEvent.type(heightInput, '2');

      expect(onChange).toHaveBeenCalledWith({
        openings: [expect.objectContaining({ heightInches: expect.any(Number) })],
      });
    });

    it('calls onChange when opening offset is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={designWithOpening} onChange={onChange} saveStatus="idle" />);

      const offsetInput = screen.getByRole('spinbutton', { name: 'Offset (in)' });
      await userEvent.type(offsetInput, '6');

      expect(onChange).toHaveBeenCalledWith({
        openings: [expect.objectContaining({ offsetInches: expect.any(Number) })],
      });
    });

    it('calls onChange when opening sill height is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={designWithOpening} onChange={onChange} saveStatus="idle" />);

      const sillInput = screen.getByRole('spinbutton', { name: 'Sill (in)' });
      await userEvent.type(sillInput, '4');

      expect(onChange).toHaveBeenCalledWith({
        openings: [expect.objectContaining({ sillHeightInches: expect.any(Number) })],
      });
    });

    it('renders multiple openings with correct labels', () => {
      const multiDesign: Design = {
        ...mockDesign,
        openings: [
          { type: 'Door', wall: 'Front', offsetInches: 24, widthInches: 36, heightInches: 80, sillHeightInches: 0 },
          { type: 'Window', wall: 'Left', offsetInches: 12, widthInches: 36, heightInches: 36, sillHeightInches: 36 },
        ],
      };
      render(<DesignPanel design={multiDesign} onChange={vi.fn()} saveStatus="idle" />);

      expect(screen.getByText('Door #1')).toBeInTheDocument();
      expect(screen.getByText('Window #2')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Door #1')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Window #2')).toBeInTheDocument();
    });
  });

  describe('remaining dimension inputs', () => {
    it('calls onChange when depth feet is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

      const depthFeetInput = screen.getByRole('spinbutton', { name: 'Depth feet' });
      await userEvent.type(depthFeetInput, '4');

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ depthFeet: expect.any(Number) }));
    });

    it('calls onChange when width inches is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

      const widthInchesInput = screen.getByRole('spinbutton', { name: 'Width inches' });
      await userEvent.type(widthInchesInput, '6');

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ widthInches: expect.any(Number) }));
    });

    it('calls onChange when height inches is changed', async () => {
      const onChange = vi.fn();
      render(<DesignPanel design={mockDesign} onChange={onChange} saveStatus="idle" />);

      const heightInchesInput = screen.getByRole('spinbutton', { name: 'Wall height inches' });
      await userEvent.type(heightInchesInput, '6');

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ heightInches: expect.any(Number) }));
    });
  });
});
