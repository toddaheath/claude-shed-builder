import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DimensionInput from '../DimensionInput';

describe('DimensionInput', () => {
  it('renders label and both fields', () => {
    render(
      <DimensionInput
        label="Width"
        feet={8}
        inches={6}
        onFeetChange={vi.fn()}
        onInchesChange={vi.fn()}
      />
    );
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Width feet' })).toHaveValue(8);
    expect(screen.getByRole('spinbutton', { name: 'Width inches' })).toHaveValue(6);
  });

  it('calls onFeetChange when feet value changes', async () => {
    const onFeetChange = vi.fn();
    render(
      <DimensionInput
        label="Depth"
        feet={10}
        inches={0}
        onFeetChange={onFeetChange}
        onInchesChange={vi.fn()}
      />
    );
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Depth feet' }), '2');
    expect(onFeetChange).toHaveBeenCalled();
  });

  it('calls onInchesChange when inches value changes', async () => {
    const onInchesChange = vi.fn();
    render(
      <DimensionInput
        label="Height"
        feet={8}
        inches={0}
        onFeetChange={vi.fn()}
        onInchesChange={onInchesChange}
      />
    );
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Height inches' }), '6');
    expect(onInchesChange).toHaveBeenCalled();
  });

  it('uses custom min/max for feet', () => {
    render(
      <DimensionInput
        label="Wall Height"
        feet={8}
        inches={0}
        onFeetChange={vi.fn()}
        onInchesChange={vi.fn()}
        minFeet={6}
        maxFeet={20}
      />
    );
    const feetInput = screen.getByRole('spinbutton', { name: 'Wall height feet' });
    expect(feetInput).toHaveAttribute('min', '6');
    expect(feetInput).toHaveAttribute('max', '20');
  });

  it('uses default min/max when not specified', () => {
    render(
      <DimensionInput
        label="Width"
        feet={8}
        inches={0}
        onFeetChange={vi.fn()}
        onInchesChange={vi.fn()}
      />
    );
    const feetInput = screen.getByRole('spinbutton', { name: 'Width feet' });
    expect(feetInput).toHaveAttribute('min', '4');
    expect(feetInput).toHaveAttribute('max', '60');
  });

  it('has proper accessibility group structure', () => {
    render(
      <DimensionInput
        label="Width"
        feet={8}
        inches={0}
        onFeetChange={vi.fn()}
        onInchesChange={vi.fn()}
      />
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'width-label');
  });

  it('lowercases multi-word labels for aria-labels', () => {
    render(
      <DimensionInput
        label="Wall Height"
        feet={8}
        inches={0}
        onFeetChange={vi.fn()}
        onInchesChange={vi.fn()}
      />
    );
    expect(screen.getByRole('spinbutton', { name: 'Wall height feet' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Wall height inches' })).toBeInTheDocument();
  });
});
