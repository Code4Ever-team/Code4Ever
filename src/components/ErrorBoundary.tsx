import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Code4Ever ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 min-w-0 w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center select-none bg-[#09090b]">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {this.props.fallbackTitle || 'Görünüm Yüklenirken Bir Hata Oluştu'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed font-mono">
            {this.props.fallbackMessage ||
              'Mesajlar veya sohbet verileri işlenirken geçici bir sorunla karşılaşıldı. Lütfen yenileyin.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yeniden Dene</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
