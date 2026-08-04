import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Nama area untuk pesan error */
  area?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary dengan pesan Bahasa Indonesia dan tombol retry.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[STAY ErrorBoundary${this.props.area ? `: ${this.props.area}` : ''}]`, error, info);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-coral-200 bg-coral-50 px-6 py-12 text-center dark:border-coral-900 dark:bg-coral-950/40"
          role="alert"
          data-testid="error-boundary"
        >
          <AlertTriangle className="mb-4 h-12 w-12 text-coral-500" aria-hidden />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Terjadi Kesalahan
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {this.props.area
              ? `Bagian ${this.props.area} mengalami masalah. Data Anda aman — silakan coba lagi.`
              : 'Aplikasi mengalami masalah sementara. Silakan coba lagi.'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-w-full overflow-auto rounded-lg bg-white/80 p-3 text-left text-xs text-coral-800 dark:bg-slate-900">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={this.handleRetry}
              className="min-h-[44px] rounded-xl"
            >
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] rounded-xl"
              onClick={() => {
                window.open(
                  `mailto:support@stay.com?subject=Bug Report&body=${encodeURIComponent(
                    `Error: ${this.state.error?.message ?? 'unknown'}\nArea: ${this.props.area ?? 'app'}`
                  )}`,
                  '_blank'
                );
              }}
            >
              Laporkan Bug
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
