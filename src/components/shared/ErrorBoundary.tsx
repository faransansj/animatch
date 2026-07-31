import React from 'react';
import * as Sentry from '@sentry/react';
import '@/styles/ErrorBoundary.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.</p>
            <button
              onClick={() => window.location.reload()}
              className="error-boundary-reload"
            >
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Technical Details (Dev Mode)</summary>
                <pre className="error-boundary-error">
                  <strong>Error:</strong> {this.state.error.message}<br />
                  <strong>Stack:</strong> {this.state.error.stack}<br />
                  {this.state.errorInfo && (
                    <>
                      <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback component for specific error types
export function NetworkErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-boundary-fallback network-error">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">🌐</div>
        <h2>Network Connection Error</h2>
        <p>We're having trouble connecting to our servers. Please check your internet connection and try again.</p>
        <button onClick={onRetry} className="error-boundary-reload">
          Try Again
        </button>
      </div>
    </div>
  );
}

export function ModelLoadingErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-boundary-fallback model-error">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">🤖</div>
        <h2>Model Loading Error</h2>
        <p>Failed to load AI models. This might be due to slow internet connection or server issues.</p>
        <button onClick={onRetry} className="error-boundary-reload">
          Retry Loading
        </button>
      </div>
    </div>
  );
}

export function FaceDetectionErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-boundary-fallback face-error">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">👤</div>
        <h2>Face Detection Error</h2>
        <p>We couldn't detect a face in your image. Please make sure your face is clearly visible and well-lit.</p>
        <button onClick={onRetry} className="error-boundary-reload">
          Try Another Photo
        </button>
      </div>
    </div>
  );
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;