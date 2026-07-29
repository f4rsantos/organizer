import { Component, Suspense } from 'react'
import { Button } from '@/components/ui/button'

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-muted-foreground">{this.props.errorLabel}</p>
        <Button type="button" variant="outline" size="sm" onClick={this.props.onRetry}>
          {this.props.retryLabel}
        </Button>
      </div>
    )
  }
}

export function LazyBoundary({ children, fallback = null, errorLabel, retryLabel, retryKey, onRetry }) {
  return (
    <ChunkErrorBoundary key={retryKey} errorLabel={errorLabel} retryLabel={retryLabel} onRetry={onRetry}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ChunkErrorBoundary>
  )
}
