import React, { Component, type ReactNode } from "react";
import { Inbox, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WidgetErrorBoundary extends Component<Props & { onRetry?: () => void }, ErrorBoundaryState> {
  constructor(props: Props & { onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <span className="wd-text-muted text-[11px]">
            Something went wrong loading this widget
          </span>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium wd-text-muted hover:wd-text-primary transition-colors"
          >
            <RefreshCw size={10} />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WidgetShell({ children }: Props) {
  return <WidgetErrorBoundary>{children}</WidgetErrorBoundary>;
}

export function WidgetSkeleton() {
  return (
    <div className="space-y-2.5 py-3">
      <div className="h-3 w-2/5 rounded wd-widget-skeleton" />
      <div className="h-3 w-3/4 rounded wd-widget-skeleton" />
      <div className="h-3 w-3/5 rounded wd-widget-skeleton" />
    </div>
  );
}

export function WidgetEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2.5 wd-empty-state">
      <div className="w-8 h-8 rounded-full bg-[var(--wd-surface-elevated)]/50 flex items-center justify-center">
        <Inbox size={16} className="wd-text-muted opacity-50" />
      </div>
      <span className="wd-text-muted text-[11px] text-center leading-relaxed max-w-[200px]">
        {message}
      </span>
    </div>
  );
}
