import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { loadFirebaseConfig } from '@/lib/firebase'
import { notesApp } from '@/apps/notes'

const MATH_OPTIONS = [
  { key: 'notesMathSolveEquations', labelKey: 'notesMathSolve', descKey: 'notesMathSolveDesc' },
  { key: 'notesMathSelectionGraph', labelKey: 'notesMathSelection', descKey: 'notesMathSelectionDesc' },
  { key: 'notesMathStepByStep', labelKey: 'notesMathSteps', descKey: 'notesMathStepsDesc' },
]

export function NotesAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? { notes: false }
  const mathEnabled = useStore(s => s.settings?.notesMathEnabled ?? false)
  const math = {
    notesMathSolveEquations: useStore(s => s.settings?.notesMathSolveEquations ?? true),
    notesMathSelectionGraph: useStore(s => s.settings?.notesMathSelectionGraph ?? true),
    notesMathStepByStep: useStore(s => s.settings?.notesMathStepByStep ?? true),
  }
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const firebaseConnected = !!loadFirebaseConfig()
  const [confirmOff, setConfirmOff] = useState(false)

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    updateSettings({ apps: { ...apps, notes: true } })
  }
  const disable = () => {
    wipeAppData(notesApp.wipe)
    updateSettings({ apps: { ...apps, notes: false } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.notes}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.notesEnable}</p>
              <p className="text-xs text-muted-foreground">{t.notesEnableDesc}</p>
            </div>
            <Switch checked={apps.notes} onCheckedChange={toggle} />
          </div>
          {apps.notes && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.notesMathEnable}</p>
                  <p className="text-xs text-muted-foreground">{t.notesMathEnableDesc}</p>
                </div>
                <Switch checked={mathEnabled} onCheckedChange={v => updateSettings({ notesMathEnabled: v })} />
              </div>
              {mathEnabled && (
                <div className="space-y-3 border-l-2 border-border/60 pl-3">
                  {MATH_OPTIONS.map(option => (
                    <div key={option.key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm">{t[option.labelKey]}</p>
                        <p className="text-xs text-muted-foreground">{t[option.descKey]}</p>
                      </div>
                      <Switch checked={math[option.key]}
                        onCheckedChange={v => updateSettings({ [option.key]: v })} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!firebaseConnected && (
            <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {t.notesCanvasWarning}
            </p>
          )}
        </div>
        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disable} />
      </DialogContent>
    </Dialog>
  )
}
