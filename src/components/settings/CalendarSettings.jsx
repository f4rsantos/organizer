import { Label } from '@/components/ui/label'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ScheduleImportPanel } from './ScheduleImportPanel'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const DEFAULT_NOW_COLOR = '#ef4444'

function ColorSwatch({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <ClassColorDot compact color={value} onChange={onChange} />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

export function CalendarSettings({ semesterId, semesterStart, semesterEnd }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const nowColor = useStore(s => s.settings?.calendarNowColor ?? DEFAULT_NOW_COLOR)
  const weekStartsOn = useStore(s => s.settings?.weekStartsOn ?? 1)
  const updateSettings = useStore(s => s.updateSettings)

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>{t.calendarColors}</Label>
          <button onClick={() => updateSettings({ calendarNowColor: null })}
            className="text-xs text-primary hover:underline">
            {t.themeColorReset}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t.calendarNowColorDesc}</p>
        <div className="pt-2 flex flex-col gap-3">
          <ColorSwatch
            label={t.calendarNowColor}
            value={nowColor}
            onChange={hex => updateSettings({ calendarNowColor: hex })}
          />
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <Label>{t.weekStartDay}</Label>
        <Select value={String(weekStartsOn)} onValueChange={v => updateSettings({ weekStartsOn: Number(v) })}
          items={[0, 1, 2, 3, 4, 5, 6].map(dow => ({ value: String(dow), label: t.weekdays[(dow + 6) % 7] }))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {[0, 1, 2, 3, 4, 5, 6].map(dow => (
              <SelectItem key={dow} value={String(dow)}>{t.weekdays[(dow + 6) % 7]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label>{t.scheduleImportTitle}</Label>
        <ScheduleImportPanel
          semesterId={semesterId}
          semesterStart={semesterStart}
          semesterEnd={semesterEnd}
        />
      </div>
    </div>
  )
}
