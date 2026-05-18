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
        <div className="min-h-screen flex items-center justify-center p-8 bg-bloom-paper">
          <div className="bg-white border border-bloom-rose/40 rounded-2xl p-6 max-w-2xl w-full">
            <p className="text-bloom-rosedk font-serif text-xl font-medium mb-2">Error de render</p>
            <pre className="text-bloom-mute text-xs overflow-auto whitespace-pre-wrap font-sans">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 bg-bloom-rose/20 hover:bg-bloom-rose/30 border border-bloom-rose/40 rounded-full text-sm text-bloom-rosedk"
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
