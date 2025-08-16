import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // You can log to a service here
    console.error('[ErrorBoundary caught]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, Arial, sans-serif' }}>
          <h1 style={{ marginBottom: 8 }}>Something went wrong.</h1>
          <p style={{ color: '#555' }}>The UI crashed. See console for details.</p>
          <button onClick={() => location.reload()} style={{ marginTop: 16, padding: '8px 12px' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
