import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

function ThrowingChild({ error }: { error: Error }) {
  throw error;
}

function GoodChild() {
  return <div>All good</div>;
}

let shouldThrow = true;

function ConditionalThrowChild() {
  if (shouldThrow) throw new Error('Boom');
  return <div>Recovered</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error('Something broke')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('shows generic message when error has no message', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error('')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('renders Try Again button that resets the error state', async () => {
    render(
      <ErrorBoundary>
        <ConditionalThrowChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Stop throwing before clicking Try Again
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('uses custom height prop', () => {
    const { container } = render(
      <ErrorBoundary height="50vh">
        <ThrowingChild error={new Error('fail')} />
      </ErrorBoundary>
    );
    const box = container.firstChild as HTMLElement;
    expect(box).toBeTruthy();
  });
});
