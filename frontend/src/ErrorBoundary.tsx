import React from 'react';

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any): State {
    return { hasError: true, message: String(err?.message || err) };
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2 style={{ marginBottom: 8 }}>Ошибка в интерфейсе</h2>
          <pre style={{ background:'#111', color:'#eee', padding:12, borderRadius:8, overflow:'auto' }}>
{this.state.message || 'unknown error'}
          </pre>
          <p style={{opacity:.7, marginTop:8}}>Смотри консоль браузера (F12) → Console для стека.</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}
