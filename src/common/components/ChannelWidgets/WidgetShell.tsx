import React, { Component, type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WidgetErrorBoundary extends Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-6 wd-text-muted text-[11px]">
          Failed to load widget
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
    <div className="flex flex-col items-center justify-center py-6 gap-2">
      <Inbox size={18} className="wd-text-muted opacity-40" />
      <span className="wd-text-muted text-[11px] text-center leading-relaxed">
        {message}
      </span>
    </div>
  );
}
