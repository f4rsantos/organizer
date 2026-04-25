import { Circle, CircleCheck, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtMins } from './formatters'

function BreakDial({ label, value, onChange, min = 1, max = 120 }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        className="w-16 h-8 text-sm text-center"
        value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
      />
    </div>
  )
}

function ScheduledTimeRow({ totalMins, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
      <span className="text-sm tabular-nums">{fmtMins(totalMins)}</span>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function FocusSettingsPanel({
  t,
  lang,
  focus,
  newTimeH,
  newTimeM,
  setNewTimeH,
  setNewTimeM,
  updateFocusSettings,
}) {
  const addScheduledTime = () => {
    const mins = newTimeH * 60 + newTimeM
    if (!focus.scheduledTimes.includes(mins)) {
      updateFocusSettings({ scheduledTimes: [...focus.scheduledTimes, mins].sort((a, b) => a - b) })
    }
  }

  const removeScheduledTime = mins => {
    updateFocusSettings({ scheduledTimes: focus.scheduledTimes.filter(x => x !== mins) })
  }

  const displayBreakLabel = (focus.breakLabel ?? '').trim() || (lang === 'pt' ? 'momento pomodoro' : 'pomodoro time')

  return (
    <div className="relative z-20 w-full max-w-xs space-y-4 rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => updateFocusSettings({ useInterval: !focus.useInterval })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {focus.useInterval
          ? <CircleCheck className="h-4 w-4 text-primary" />
          : <Circle className="h-4 w-4" />}
        {t.focusIntervalMode}
      </button>

      {focus.useInterval && (
        <>
          <div className="flex justify-center gap-8">
            <BreakDial
              label={t.focusIntervalEvery}
              value={focus.intervalMins}
              onChange={v => updateFocusSettings({ intervalMins: v })}
            />
            <BreakDial
              label={t.focusIntervalBreakFor}
              value={focus.intervalBreakMins}
              onChange={v => updateFocusSettings({ intervalBreakMins: v })}
            />
          </div>
          <button
            onClick={() => updateFocusSettings({ intervalResetMode: (focus.intervalResetMode ?? 'reset') === 'reset' ? 'continue' : 'reset' })}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {(focus.intervalResetMode ?? 'reset') === 'reset'
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
            {(focus.intervalResetMode ?? 'reset') === 'reset' ? t.focusAfterBreakReset : t.focusAfterBreakContinue}
          </button>
        </>
      )}

      <button
        onClick={() => updateFocusSettings({ useScheduled: !focus.useScheduled })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {focus.useScheduled
          ? <CircleCheck className="h-4 w-4 text-primary" />
          : <Circle className="h-4 w-4" />}
        {t.focusScheduledMode}
      </button>

      {focus.useScheduled && (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <BreakDial label="h" value={newTimeH} onChange={setNewTimeH} min={0} max={23} />
            <BreakDial label="m" value={newTimeM} onChange={setNewTimeM} min={0} max={59} />
            <BreakDial
              label={t.focusScheduledBreakFor}
              value={focus.scheduledBreakMins}
              onChange={v => updateFocusSettings({ scheduledBreakMins: v })}
            />
            <Button size="icon" variant="ghost" onClick={addScheduledTime} className="h-8 w-8 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {focus.scheduledTimes.map(mins => (
              <ScheduledTimeRow key={mins} totalMins={mins} onRemove={() => removeScheduledTime(mins)} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t.focusFocusLabel}</span>
          <Input
            className="h-8 text-sm"
            placeholder={lang === 'pt' ? 'ex: a focar…' : 'e.g. keep going…'}
            value={focus.focusLabel ?? ''}
            onChange={e => updateFocusSettings({ focusLabel: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t.focusBreakLabel}</span>
          <Input
            className="h-8 text-sm"
            placeholder={displayBreakLabel}
            value={focus.breakLabel ?? ''}
            onChange={e => updateFocusSettings({ breakLabel: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
