'use client'

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })

    // Log to error monitoring service (e.g., Sentry) in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
                <p className="text-sm text-gray-600 mt-1">
                  We&apos;re sorry for the inconvenience. The error has been logged.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-4 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm font-medium text-red-900 mb-2">Error Details:</p>
                <p className="text-xs text-red-700 font-mono mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <details className="text-xs text-red-600 font-mono">
                    <summary className="cursor-pointer mb-1">Stack Trace</summary>
                    <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
