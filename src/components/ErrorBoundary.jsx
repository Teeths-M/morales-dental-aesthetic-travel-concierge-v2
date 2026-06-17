/**
 * Error Boundary Wrapper for Route-Level Pages
 * Catches uncaught errors and displays fallback UI instead of crashing entire app
 * 
 * Usage: Wrap all route-level pages in App.jsx
 * 
 * <Route 
 *   path="/admin" 
 *   element={<ErrorBoundary><SimpleAdminDashboard /></ErrorBoundary>} 
 * />
 */
import React, { Component } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                We encountered an unexpected error. This has been logged for investigation.
              </p>
              <Button onClick={this.handleReset} variant="outline" size="sm">
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;