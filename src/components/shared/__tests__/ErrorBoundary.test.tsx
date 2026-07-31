import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary, {
  NetworkErrorFallback,
  withErrorBoundary,
} from '@/components/shared/ErrorBoundary';

const captureException = vi.hoisted(() => vi.fn());
vi.mock('@sentry/react', () => ({ captureException }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  captureException.mockClear();
});

describe('ErrorBoundary', () => {
  it('renders children', () => {
    render(<ErrorBoundary><div>content</div></ErrorBoundary>);
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('renders a fallback and reports render errors', () => {
    const Broken = () => { throw new Error('broken'); };
    render(<ErrorBoundary fallback={<div>fallback</div>}><Broken /></ErrorBoundary>);
    expect(screen.getByText('fallback')).toBeTruthy();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('wraps components with withErrorBoundary', () => {
    const Wrapped = withErrorBoundary(() => <div>wrapped</div>);
    render(<Wrapped />);
    expect(screen.getByText('wrapped')).toBeTruthy();
  });

  it('invokes fallback retry actions', () => {
    const retry = vi.fn();
    render(<NetworkErrorFallback onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
