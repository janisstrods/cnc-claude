import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('UI error', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a0f08', color: '#f0e3c2', fontFamily: 'EB Garamond, serif' }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#e2bd72' }}>The messenger stumbled</h2>
          <p>Something went wrong while drawing the battle. Your game is saved; you can return to the menu and continue it.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.6 }}>{this.state.error.message}</pre>
          <button
            style={{ marginTop: 12, padding: '8px 18px', fontFamily: 'Cinzel, serif', background: '#8e1b1b', color: '#fbe7a6', border: '1px solid #e8c45a', borderRadius: 6, cursor: 'pointer' }}
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset();
            }}
          >
            Return to menu
          </button>
        </div>
      </div>
    );
  }
}
