import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('Landing render failed:', error);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold">Landing gagal dimuat</h1>
            <p className="text-slate-400 text-sm">
              Coba muat ulang halaman. Jika masih bermasalah, hapus data situs untuk monefyi.com di browser.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-semibold text-sm"
            >
              Muat ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
