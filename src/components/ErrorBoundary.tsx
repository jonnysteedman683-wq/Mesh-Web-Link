import React from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tactical Mesh ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[420px] flex items-center justify-center p-6 bg-slate-950 text-slate-100">
          <div className="max-w-xl w-full bg-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-white">
                  {this.props.fallbackTitle || 'TACTICAL COMPONENT FAULT DETECTED'}
                </h2>
                <p className="text-xs text-rose-300/80 font-mono">
                  Runtime isolation active. The rest of the mesh fabric remains operational.
                </p>
              </div>
            </div>

            <div className="bg-black/60 rounded-xl p-3 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Diagnostic Message:</span>
              </div>
              <p className="text-rose-300 font-semibold break-words">
                {this.state.error?.message || 'An unexpected runtime state occurred.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recover Component</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono transition-all cursor-pointer border border-slate-700"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload Mesh App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
