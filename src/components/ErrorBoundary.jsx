import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background py-12 px-6 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Something went wrong!</AlertTitle>
            <AlertDescription>
              <p>We're sorry, an unexpected error occurred.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {this.state.error && this.state.error.toString()}
              </p>
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary>Error details</summary>
                  <pre className="mt-1 p-2 bg-red-900 text-white rounded-md overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;