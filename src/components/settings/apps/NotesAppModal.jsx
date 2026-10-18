import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { SettingToggle } from '../SettingRow'

const MATH_OPTIONS = [
  { key: 'notesMathSolveEquations', labelKey: 'notesMathSolve', descKey: 'notesMathSolveDesc' },
  { key: 'notesMathSelectionGraph', labelKey: 'notesMathSelection', descKey: 'notesMathSelectionDesc' },
  { key: 'notesMathStepByStep', labelKey: 'notesMathSteps', descKey: 'notesMathStepsDesc' },
]

export function NotesAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const mathEnabled = useStore(s => s.settings?.notesMathEnabled ?? false)
  const calendarLinkEnabled = useStore(s => s.settings?.notesCalendarLink ?? false)
  const math = {
    notesMathSolveEquations: useStore(s => s.settings?.notesMathSolveEquations ?? true),
    notesMathSelectionGraph: useStore(s => s.settings?.notesMathSelectionGraph ?? true),
    notesMathStepByStep: useStore(s => s.settings?.notesMathStepByStep ?? true),
  }
  const updateSettings = useStore(s => s.updateSettings)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.notes}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/60">
          <SettingToggle label={t.notesCalendarLink} desc={t.notesCalendarLinkDesc} checked={calendarLinkEnabled} onChange={v => updateSettings({ notesCalendarLink: v })} />
          <SettingToggle label={t.notesMathEnable} desc={t.notesMathEnableDesc} checked={mathEnabled} onChange={v => updateSettings({ notesMathEnabled: v })} />
          {mathEnabled && MATH_OPTIONS.map(option => (
            <SettingToggle key={option.key} label={t[option.labelKey]} desc={t[option.descKey]}
              checked={math[option.key]} onChange={v => updateSettings({ [option.key]: v })} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
