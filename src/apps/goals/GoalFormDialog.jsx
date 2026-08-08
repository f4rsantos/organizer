import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { cn } from '@/lib/utils'
import { CUSTOM_CADENCE, GOAL_CADENCES, isCustomCadence } from '@/lib/goals'
import { TONE_CUSTOM, TONE_RANDOM, GOAL_TONES } from '@/lib/goalMessages'

const TONE_VALUES = [...GOAL_TONES, TONE_RANDOM, TONE_CUSTOM]

const TONE_LABEL_KEYS = {
  purpose: 'goalTonePurpose',
  warm: 'goalToneWarm',
  upbeat: 'goalToneUpbeat',
  game: 'goalToneGame',
  random: 'goalToneRandom',
  custom: 'goalToneCustom',
}

const TARGET_VALUES = ['endless', 'count', 'date']

const TARGET_LABEL_KEYS = {
  endless: 'goalTargetEndless',
  count: 'goalTargetCount',
  date: 'goalTargetDate',
}

const CADENCE_LABEL_KEYS = {
  1: 'goalCadenceDaily',
  2: 'goalCadence2Days',
  3: 'goalCadence3Days',
  7: 'goalCadenceWeekly',
  30: 'goalCadenceMonthly',
  custom: 'goalCadenceCustom',
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function GoalFormDialog({ open, onOpenChange, goal, onSubmit, t }) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [cadenceDays, setCadenceDays] = useState(goal?.cadenceDays ?? 1)
  const [weekdays, setWeekdays] = useState(Array.isArray(goal?.weekdays) ? goal.weekdays : [])
  const [requireNote, setRequireNote] = useState(goal?.requireNote ?? false)
  const [color, setColor] = useState(goal?.color ?? '#22c55e')
  const [tone, setTone] = useState(goal?.tone ?? 'warm')
  const [customMessage, setCustomMessage] = useState(goal?.customMessage ?? '')
  const [targetKind, setTargetKind] = useState(goal?.targetKind ?? 'endless')
  const [targetCount, setTargetCount] = useState(goal?.targetCount ? String(goal.targetCount) : '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')

  const cadenceOptions = GOAL_CADENCES.map(value => ({
    value: String(value),
    label: t[CADENCE_LABEL_KEYS[value]],
  }))

  const toneOptions = TONE_VALUES.map(value => ({ value, label: t[TONE_LABEL_KEYS[value]] }))
  const targetOptions = TARGET_VALUES.map(value => ({ value, label: t[TARGET_LABEL_KEYS[value]] }))

  const custom = isCustomCadence(cadenceDays)
  const weekdayLabels = t.weekdaysShort
  const canSubmit = Boolean(title.trim())
    && (!custom || weekdays.length > 0)
    && (tone !== TONE_CUSTOM || Boolean(customMessage.trim()))
    && (targetKind !== 'count' || Number(targetCount) > 0)
    && (targetKind !== 'date' || Boolean(targetDate))

  const toggleWeekday = day => {
    setWeekdays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)))
  }

  const handleCadenceChange = value => {
    setCadenceDays(value === CUSTOM_CADENCE ? CUSTOM_CADENCE : Number(value))
  }

  const submit = () => {
    const trimmed = title.trim()
    if (!canSubmit) return
    onSubmit({
      title: trimmed,
      cadenceDays,
      weekdays: custom ? weekdays : [],
      requireNote,
      color,
      tone,
      customMessage: tone === TONE_CUSTOM ? customMessage.trim() : '',
      targetKind,
      targetCount: targetKind === 'count' ? Number(targetCount) : null,
      targetDate: targetKind === 'date' ? targetDate : null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? t.goalEdit : t.goalAdd}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-4 max-h-[60vh] overflow-x-hidden overflow-y-auto">
          <div className="space-y-1.5">
            <Label>{t.goalTitleLabel}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t.goalTitlePlaceholder}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.goalCadenceLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.goalCadenceDesc}</p>
            <Select value={String(cadenceDays)} onValueChange={handleCadenceChange} items={cadenceOptions}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {cadenceOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {custom && (
            <div className="space-y-1.5">
              <Label>{t.goalWeekdaysLabel}</Label>
              <p className="text-xs text-muted-foreground">{t.goalWeekdaysDesc}</p>
              <div className="flex justify-center gap-1.5 pt-1">
                {WEEKDAY_ORDER.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    title={weekdayLabels[index]}
                    className={cn(
                      'h-8 w-8 rounded-full text-xs font-medium transition-colors shrink-0',
                      weekdays.includes(day)
                        ? 'bg-primary text-primary-foreground border-2 border-primary'
                        : 'border-2 border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground',
                    )}
                  >
                    {weekdayLabels[index].charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t.goalRequireNote}</p>
              <p className="text-xs text-muted-foreground">{t.goalRequireNoteDesc}</p>
            </div>
            <Switch checked={requireNote} onCheckedChange={setRequireNote} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.goalTargetLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.goalTargetDesc}</p>
            <Select value={targetKind} onValueChange={setTargetKind} items={targetOptions}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {targetOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetKind === 'count' && (
              <Input type="number" min="1" value={targetCount}
                onChange={e => setTargetCount(e.target.value)}
                placeholder={t.goalTargetCountPlaceholder} className="h-9" />
            )}
            {targetKind === 'date' && (
              <Input type="date" value={targetDate}
                onChange={e => setTargetDate(e.target.value)} className="h-9" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t.goalToneLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.goalToneDesc}</p>
            <Select value={tone} onValueChange={setTone} items={toneOptions}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {toneOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tone === TONE_CUSTOM && (
              <Input value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                placeholder={t.goalToneCustomPlaceholder} className="h-9" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t.goalColor}</Label>
            <ClassColorDot color={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!canSubmit}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
