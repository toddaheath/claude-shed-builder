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
});
