"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the whole application
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    // Clear any existing data from localStorage to prevent persistent errors
    if (this.state.error?.message.includes('quota') || 
        this.state.error?.message.includes('storage') ||
        this.state.error?.message.includes('exceeded')) {
      try {
        localStorage.clear();
        console.log('Cleared localStorage due to storage error');
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
    }
    
    // Reset the state and reload the page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full p-6 rounded-lg border border-border bg-card shadow-lg">
            <div className="mb-6 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Something went wrong</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The application encountered an error. This could be due to:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Storage quota exceeded</li>
                <li>Network connectivity issues</li>
                <li>Temporary server problems</li>
                <li>Browser compatibility issues</li>
              </ul>
              
              {this.state.error && (
                <div className="p-3 bg-muted rounded-md text-xs overflow-auto">
                  <p className="font-medium text-destructive">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <details className="mt-2 text-muted-foreground">
                      <summary className="cursor-pointer">Stack trace</summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="pt-4">
                <Button 
                  onClick={this.handleReset}
                  variant="default" 
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset and Refresh
                </Button>
                <p className="mt-2 text-xs text-center text-muted-foreground">
                  This will attempt to fix storage issues and refresh the application.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 