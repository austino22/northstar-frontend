import React from 'react';

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container-ns py-10">
          <div className="glass p-6">
            <h1 className="text-lg font-semibold mb-2">Something went wrong.</h1>
            <pre className="text-xs opacity-70 overflow-auto max-h-48">
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
