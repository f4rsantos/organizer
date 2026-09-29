import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { describeFirebaseError } from '@/lib/firebaseErrors'
import { RulesBox } from '@/components/settings/RulesBox'

export function SyncRulesUpdateModal({ checking, error, onConfirm, onDismiss }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 p-safe">
      <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <p className="font-semibold text-sm">{t.syncRulesUpdateTitle}</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.syncRulesUpdateDesc}</p>
        <RulesBox label={t.firebaseRulesTemplateLink} />
        <p className="text-xs text-muted-foreground leading-relaxed">{t.syncRulesUpdateHint}</p>
        {error && <p className="text-xs text-destructive leading-relaxed">{describeFirebaseError(error, t)}</p>}
        <div className="space-y-2">
          <Button className="w-full" onClick={onConfirm} disabled={checking}>
            {checking && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            {t.syncRulesUpdateConfirm}
          </Button>
          <button onClick={onDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t.syncRulesUpdateLater}
          </button>
        </div>
      </div>
    </div>
  )
}
