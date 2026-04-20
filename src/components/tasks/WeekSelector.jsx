import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { weekDateRange, getHolidaysForWeek } from '@/lib/semesterUtils'
import { useStrings } from '@/lib/strings'
import { useStore } from '@/store/useStore'

export function WeekSelector({ week, weekCount, startDate, onChange, semesterHolidays = [] }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const range = startDate ? weekDateRange(startDate, week) : null
  const weekHolidays = startDate ? getHolidaysForWeek(startDate, week, semesterHolidays) : []

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(w => Math.max(1, w - 1))} disabled={week <= 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 text-center">
        <p className="font-semibold text-sm">{t.weekLabel(week)}</p>
        {range && <p className="text-xs text-muted-foreground">{range.start} – {range.end}</p>}
        {weekHolidays.length > 0 && (
          <p className="text-xs text-amber-500 dark:text-amber-400 font-medium mt-0.5">
            {weekHolidays.map(h => h.name).join(', ')}
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(w => Math.min(weekCount, w + 1))} disabled={week >= weekCount}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
