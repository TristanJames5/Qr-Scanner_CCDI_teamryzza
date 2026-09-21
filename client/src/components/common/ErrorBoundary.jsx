import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-2xl w-full shadow-2xl">
            <h1 className="text-2xl font-bold text-rose-500 mb-4 flex items-center gap-2">
              <span className="text-3xl">??</span> Application Error
            </h1>
            <p className="mb-4">Something went wrong while rendering this page.</p>
            
            <div className="bg-black/50 p-4 rounded-lg overflow-x-auto text-xs font-mono text-slate-400 mb-6 border border-slate-800">
              <p className="text-rose-400 font-bold mb-2">{this.state.error?.toString()}</p>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </div>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
