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

    // Click the delete button for first design
    await userEvent.click(screen.getByLabelText('Delete Shed A'));

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

    await userEvent.click(screen.getByLabelText('Delete Shed A'));

    expect(screen.getByText('Delete Design')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('opens create dialog and calls onCreate', async () => {
    const onCreate = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={onCreate}
        onDelete={vi.fn()}
      />
    );

    // Click the add button
    await userEvent.click(screen.getByLabelText('Create new design'));

    // Dialog should appear
    expect(screen.getByText('New Design')).toBeInTheDocument();

    // Type a name and click Create
    const nameInput = screen.getByLabelText('Design Name');
    await userEvent.type(nameInput, 'My New Shed');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onCreate).toHaveBeenCalledWith('My New Shed');
  });

  it('does not create with empty name', async () => {
    const onCreate = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={onCreate}
        onDelete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByLabelText('Create new design'));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows dimensions without openings summary when no openings', () => {
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    // Shed A: 8' × 10' with no openings — no "door" or "window" text
    expect(screen.getByText("8' × 10'")).toBeInTheDocument();
  });

  it('shows opening count in design summary', () => {
    const designsWithOpenings: Design[] = [
      {
        ...mockDesigns[0],
        openings: [
          { type: 'Door', wall: 'Front', widthInches: 36, heightInches: 80, offsetInches: 12, sillHeightInches: 0 },
          { type: 'Window', wall: 'Right', widthInches: 30, heightInches: 24, offsetInches: 24, sillHeightInches: 48 },
          { type: 'Window', wall: 'Back', widthInches: 30, heightInches: 24, offsetInches: 24, sillHeightInches: 48 },
        ],
      },
    ];
    render(
      <DesignList
        designs={designsWithOpenings}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/1 door, 2 windows/)).toBeInTheDocument();
  });

  it('shows duplicate button when onDuplicate is provided', () => {
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Duplicate Shed A')).toBeInTheDocument();
    expect(screen.getByLabelText('Duplicate Shed B')).toBeInTheDocument();
  });

  it('calls onDuplicate with design when duplicate button is clicked', async () => {
    const onDuplicate = vi.fn();
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />
    );

    await userEvent.click(screen.getByLabelText('Duplicate Shed A'));
    expect(onDuplicate).toHaveBeenCalledWith(mockDesigns[0]);
  });

  it('shows no-results message when search matches nothing', async () => {
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

    const searchInput = screen.getByPlaceholderText('Search designs...');
    await userEvent.type(searchInput, 'zzz');

    expect(screen.getByText(/No designs match "zzz"/)).toBeInTheDocument();
  });

  it('hides duplicate button when onDuplicate is not provided', () => {
    render(
      <DesignList
        designs={mockDesigns}
        selectedId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Duplicate Shed A')).not.toBeInTheDocument();
  });
});
