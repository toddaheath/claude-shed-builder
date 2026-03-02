import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DesignList from '../DesignList';
import type { Design } from '../../types';

const mockDesigns: Design[] = [
  {
    id: '1', name: 'Shed A', widthFeet: 8, widthInches: 0,
    depthFeet: 10, depthInches: 0, heightFeet: 8, heightInches: 0,
    roofPitch: 4, roofType: 'Gable', openings: [],
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2', name: 'Shed B', widthFeet: 12, widthInches: 6,
    depthFeet: 14, depthInches: 0, heightFeet: 10, heightInches: 0,
    roofPitch: 6, roofType: 'LeanTo', openings: [],
    createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('DesignList', () => {
  it('renders design names', () => {
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Shed A')).toBeInTheDocument();
    expect(screen.getByText('Shed B')).toBeInTheDocument();
  });

  it('shows empty message when no designs', () => {
    render(
      <DesignList
        designs={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/No designs yet/)).toBeInTheDocument();
  });

  it('calls onSelect when design is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={onSelect}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('Shed A'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('shows confirmation dialog before deleting', async () => {
    const onDelete = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />
    );

    // Click the delete icon for first design
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await userEvent.click(deleteButtons[0]);

    // Confirmation dialog should appear
    expect(screen.getByText('Delete Design')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();

    // onDelete should NOT have been called yet
    expect(onDelete).not.toHaveBeenCalled();

    // Click Delete in the dialog
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // Now onDelete should be called
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('shows search box when more than 3 designs and filters results', async () => {
    const fourDesigns: Design[] = [
      { ...mockDesigns[0], id: '1', name: 'Garden Shed' },
      { ...mockDesigns[1], id: '2', name: 'Workshop' },
      { ...mockDesigns[0], id: '3', name: 'Garden Office' },
      { ...mockDesigns[1], id: '4', name: 'Tool Shed' },
    ];
    render(
      <DesignList
        designs={fourDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Search box should appear with >3 designs
    const searchInput = screen.getByPlaceholderText('Search designs...');
    expect(searchInput).toBeInTheDocument();

    // Type to filter
    await userEvent.type(searchInput, 'garden');

    // Only Garden Shed and Garden Office should be visible
    expect(screen.getByText('Garden Shed')).toBeInTheDocument();
    expect(screen.getByText('Garden Office')).toBeInTheDocument();
    expect(screen.queryByText('Workshop')).not.toBeInTheDocument();
    expect(screen.queryByText('Tool Shed')).not.toBeInTheDocument();
  });

  it('hides search box when 3 or fewer designs', () => {
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByPlaceholderText('Search designs...')).not.toBeInTheDocument();
  });

  it('cancels delete without calling onDelete', async () => {
    const onDelete = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    await userEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Design')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
