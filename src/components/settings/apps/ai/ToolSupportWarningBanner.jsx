import { AlertTriangle } from 'lucide-react'

export function ToolSupportWarningBanner({ t }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-xs text-destructive leading-relaxed">{t.aiToolSupportRedirect}</p>
    </div>
  )
}
