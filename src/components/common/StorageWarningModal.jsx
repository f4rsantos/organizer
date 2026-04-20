import { HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function StorageWarningModal({ onDismiss }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6">
      <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
            <HardDrive className="h-4 w-4 text-destructive" />
          </div>
          <p className="font-semibold text-sm">{t.storageWarningTitle}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.storageWarningDesc}</p>
        <Button className="w-full" onClick={onDismiss}>{t.storageWarningAction}</Button>
      </div>
    </div>
  )
}
