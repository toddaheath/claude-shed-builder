import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import VersionPanel from '../VersionPanel';
import type { DesignVersion } from '../../types';

const mockVersions: DesignVersion[] = [
  {
    id: 'v1', designId: 'd1', versionNumber: 1, label: 'Initial',
    widthFeet: 8, widthInches: 0, depthFeet: 10, depthInches: 0,
    heightFeet: 8, heightInches: 0, roofPitch: 4, roofType: 'Gable',
    openings: [], createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'v2', designId: 'd1', versionNumber: 2, label: 'Added door',
    widthFeet: 8, widthInches: 0, depthFeet: 10, depthInches: 0,
    heightFeet: 8, heightInches: 0, roofPitch: 4, roofType: 'Gable',
    openings: [], createdAt: '2024-01-02T00:00:00Z',
  },
];

describe('VersionPanel', () => {
  it('renders version list', () => {
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(screen.getByText('v1: Initial')).toBeInTheDocument();
    expect(screen.getByText('v2: Added door')).toBeInTheDocument();
  });

  it('shows empty message when no versions', () => {
    render(
      <VersionPanel
        designId="d1"
        versions={[]}
        onLoadVersions={vi.fn()}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(screen.getByText(/No saved versions yet/)).toBeInTheDocument();
  });

  it('calls onLoadVersions on mount', () => {
    const onLoadVersions = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={[]}
        onLoadVersions={onLoadVersions}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(onLoadVersions).toHaveBeenCalledWith('d1');
  });

  it('opens save dialog and calls onSaveVersion', async () => {
    const onSaveVersion = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={onSaveVersion}
        onRestoreVersion={vi.fn()}
      />
    );

    await userEvent.click(screen.getByText('Save Version'));
    expect(screen.getByLabelText('Version Label')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Version Label'), 'My checkpoint');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveVersion).toHaveBeenCalledWith('d1', 'My checkpoint');
  });

  it('opens restore dialog when version is clicked', async () => {
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    await userEvent.click(screen.getByText('v1: Initial'));

    expect(screen.getByText('Restore Version?')).toBeInTheDocument();
  });

  it('calls onRestoreVersion when restore is confirmed', async () => {
    const onRestoreVersion = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={vi.fn()}
        onRestoreVersion={onRestoreVersion}
      />
    );

    await userEvent.click(screen.getByText('v1: Initial'));
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));

    expect(onRestoreVersion).toHaveBeenCalledWith('d1', 'v1');
  });

  it('does not save with empty label', async () => {
    const onSaveVersion = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={onSaveVersion}
        onRestoreVersion={vi.fn()}
      />
    );

    await userEvent.click(screen.getByText('Save Version'));
    // Click Save without typing a label
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveVersion).not.toHaveBeenCalled();
  });

  it('cancels save dialog without calling onSaveVersion', async () => {
    const onSaveVersion = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={onSaveVersion}
        onRestoreVersion={vi.fn()}
      />
    );

    await userEvent.click(screen.getByText('Save Version'));
    await userEvent.type(screen.getByLabelText('Version Label'), 'Some label');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSaveVersion).not.toHaveBeenCalled();
  });

  it('reloads versions when designId changes', () => {
    const onLoadVersions = vi.fn();
    const { rerender } = render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={onLoadVersions}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(onLoadVersions).toHaveBeenCalledWith('d1');

    rerender(
      <VersionPanel
        designId="d2"
        versions={[]}
        onLoadVersions={onLoadVersions}
        onSaveVersion={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(onLoadVersions).toHaveBeenCalledWith('d2');
    expect(onLoadVersions).toHaveBeenCalledTimes(2);
  });

  it('cancels restore dialog without calling onRestoreVersion', async () => {
    const onRestoreVersion = vi.fn();
    render(
      <VersionPanel
        designId="d1"
        versions={mockVersions}
        onLoadVersions={vi.fn()}
        onSaveVersion={vi.fn()}
        onRestoreVersion={onRestoreVersion}
      />
    );

    await userEvent.click(screen.getByText('v1: Initial'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRestoreVersion).not.toHaveBeenCalled();
  });
});
