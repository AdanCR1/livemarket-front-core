import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback personalizado cuando ocurre un error */
  fallback?: ReactNode;
  /** Callback para logging externo */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary genérico para islas React.
 * Atrapa errores de renderizado sin colapsar el resto de la página Astro.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MARKETCLOUD] Error capturado por ErrorBoundary:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-market-card border border-market-border flex items-center justify-center text-3xl mb-5">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-market-white mb-2">
            Algo salió mal
          </h3>
          <p className="text-sm text-market-muted text-center max-w-sm mb-6">
            Este módulo tuvo un error inesperado. El resto de la página sigue funcionando.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-5 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-semibold
                       hover:brightness-110 active:scale-95 transition-all duration-200
                       shadow-lg shadow-theme-primary/20"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
