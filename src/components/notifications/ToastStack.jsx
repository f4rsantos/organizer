import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTO_DISMISS_MS = 8000

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-background p-3 shadow-lg',
        'animate-in slide-in-from-left-4 fade-in-0 duration-150',
      )}
      style={{ '--toast-auto-dismiss-ms': `${AUTO_DISMISS_MS}ms` }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{toast.title}</p>
        {toast.body && <p className="text-xs text-muted-foreground truncate">{toast.body}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export { AUTO_DISMISS_MS }
