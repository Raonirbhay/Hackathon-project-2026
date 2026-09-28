import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#070a0f] flex flex-col items-center justify-center p-6 text-center font-mono text-slate-200">
          <div className="bg-[#0b1019] border border-red-800/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              COMMAND CENTER RUNTIME NOTICE
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              An unexpected component render exception was intercepted. The console state has been safely isolated.
            </p>
            {this.state.error && (
              <pre className="bg-[#080c12] p-3 rounded text-[11px] text-red-300 text-left overflow-x-auto border border-red-900/40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 mx-auto cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Command Center</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
