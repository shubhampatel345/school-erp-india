import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary — catches any render error in child components
 * and shows a user-friendly recovery UI instead of a white screen.
 *
 * Every page route in App.tsx is wrapped with this component so
 * one module crash NEVER blanks the whole app.
 *
 * Usage:
 *   <ErrorBoundary moduleName="Students">
 *     <StudentsPage />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, info);
    this.setState({ errorInfo: info });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const moduleName = this.props.moduleName;
      const message =
        this.state.error?.message ?? "An unexpected error occurred.";
      const isNetworkError =
        message.includes("Network") ||
        message.includes("fetch") ||
        message.includes("Failed to load");

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
          data-ocid="error-boundary.error_state"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground mb-1 font-display">
            {moduleName
              ? `${moduleName} — Something went wrong`
              : "Something went wrong"}
          </h2>

          {/* Error description */}
          <p className="text-sm text-muted-foreground mb-2 max-w-sm">
            {message}
          </p>

          {/* Hint */}
          <p className="text-xs text-muted-foreground mb-6 max-w-sm">
            {isNetworkError
              ? "A network error occurred. Check your server connection and try again."
              : "This section encountered an unexpected error. Click 'Try Again' to reload it, or navigate to another module."}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              data-ocid="error-boundary.retry_button"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleRefresh}
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
              data-ocid="error-boundary.reload_button"
            >
              Reload Page
            </button>
          </div>

          {/* Dev details (collapsed) */}
          {process.env.NODE_ENV !== "production" && this.state.errorInfo && (
            <details className="mt-6 text-left max-w-lg w-full">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Show technical details
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground overflow-auto max-h-40 scrollbar-thin">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
