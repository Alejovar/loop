import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="glass rounded-2xl p-8 max-w-md text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">Algo salió mal</h2>
            <p className="text-muted-foreground text-sm">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            <p className="text-xs text-destructive font-mono bg-destructive/10 rounded p-2 break-all">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="gradient-primary text-primary-foreground"
            >
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
