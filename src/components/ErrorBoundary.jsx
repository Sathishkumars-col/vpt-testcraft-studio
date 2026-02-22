import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Something went wrong</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
