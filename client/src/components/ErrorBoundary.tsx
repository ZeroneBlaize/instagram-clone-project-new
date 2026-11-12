import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)]">
          <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[var(--primary)]" />
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
