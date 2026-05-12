import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="bg-rose-950 border border-rose-700 rounded-xl p-6 max-w-2xl w-full">
            <p className="text-rose-400 font-bold text-lg mb-2">Error de render</p>
            <pre className="text-rose-300 text-xs overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 rounded-lg text-sm text-white"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
