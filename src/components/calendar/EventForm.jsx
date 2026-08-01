import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Mic, Circle, CircleCheck } from 'lucide-react'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { parseTaskText } from '@/lib/parser/nlpParse'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { pushEventDeletion } from '@/apps/googleCalendar/useGoogleCalendarSync'
import { loadGoogleClientId } from '@/apps/googleCalendar/googleAuth'
import { format } from 'date-fns'

const EMPTY = { title: '', date: '', startDate: '', endDate: '', multiDay: false, color: '#6366f1', note: '', startTime: '', endTime: '', syncToGoogle: false, recurrence: null }

function formFromEvent(event) {
  if (!event) return EMPTY
  const multiDay = Boolean(event.startDate && event.endDate)
  return {
    title: event.title ?? '',
    date: event.date ?? event.startDate ?? '',
    startDate: event.startDate ?? '',
    endDate: event.endDate ?? '',
    multiDay,
    color: event.color ?? '#6366f1',
    note: event.note ?? '',
    startTime: event.startTime ?? '',
    endTime: event.endTime ?? '',
    syncToGoogle: Boolean(event.syncToGoogle),
    recurrence: event.recurrence ?? null,
  }
}

export function EventForm({ open, onOpenChange, event, semesterId, defaultDate, defaultStartTime, defaultEndTime, defaultEndDate }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const addEvent = useStore(s => s.addEvent)
  const updateEvent = useStore(s => s.updateEvent)
  const deleteEvent = useStore(s => s.deleteEvent)
  const googleCalendarEnabled = useStore(s => s.settings?.apps?.googleCalendar === true) && Boolean(loadGoogleClientId())
  const initialForm = () => {
    if (event) return formFromEvent(event)
    const spansDays = Boolean(defaultEndDate)
    return {
      ...EMPTY,
      date: defaultDate ?? '',
      multiDay: spansDays,
      startDate: spansDays ? defaultDate ?? '' : '',
      endDate: spansDays ? defaultEndDate : '',
      startTime: defaultStartTime ?? '',
      endTime: defaultEndTime ?? '',
    }
  }
  const initialTouched = () => (event
    ? { date: true, startTime: Boolean(event.startTime), endTime: Boolean(event.endTime) }
    : { date: Boolean(defaultDate), startTime: Boolean(defaultStartTime), endTime: Boolean(defaultEndTime) })

  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState(initialTouched)
  const [rawTitle, setRawTitle] = useState(() => (event ? formFromEvent(event).title : ''))

  const set = patch => setForm(f => ({ ...f, ...patch }))

  const handleTitleChange = e => {
    const title = e.target.value
    setRawTitle(title)
    set({ title })
  }

  const parseTitle = rawValue => {
    if (!rawValue) return form
    const parsed = parseTaskText(rawValue, { now: new Date(), t, lang })
    const touchedNow = touched
    const next = { ...form, title: parsed.title || rawValue }
    if (!touchedNow.date && parsed.date) next.date = parsed.date
    if (!touchedNow.startTime && parsed.startTime) next.startTime = parsed.startTime
    if (!touchedNow.endTime && parsed.endTime) next.endTime = parsed.endTime

    if (!touchedNow.endTime && parsed.startTime && !parsed.endTime) {
      const baseDate = next.date || format(new Date(), 'yyyy-MM-dd')
      const d = new Date(`${baseDate}T${parsed.startTime}`)
      if (!isNaN(d.getTime())) {
        if (parsed.duration) {
          d.setMinutes(d.getMinutes() + parsed.duration)
        } else {
          d.setHours(d.getHours() + 1)
        }
        next.endTime = format(d, 'HH:mm')
      }
    }
    setForm(next)
    setRawTitle(next.title)
    return next
  }

  const handleTitleBlur = () => parseTitle(rawTitle)

  const applyTitle = title => {
    setRawTitle(title)
    set({ title })
    parseTitle(title)
  }

  const { isSupported: speechSupported, isListening, start: startListening, stop: stopListening } = useSpeechInput({
    lang,
    onResult: applyTitle,
  })

  const handleDateChange = e => {
    setTouched(x => ({ ...x, date: true }))
    set({ date: e.target.value })
  }

  const handleStartTimeChange = e => {
    setTouched(x => ({ ...x, startTime: true }))
    set({ startTime: e.target.value })
  }

  const handleEndTimeChange = e => {
    setTouched(x => ({ ...x, endTime: true }))
    set({ endTime: e.target.value })
  }

  const buildPayload = f => {
    const base = {
      title: f.title.trim(), color: f.color, note: f.note.trim(), allDay: true, semesterId: semesterId ?? null,
      syncToGoogle: googleCalendarEnabled && f.syncToGoogle,
    }
    if (f.multiDay) {
      const spanHasTime = Boolean(f.startTime)
      return {
        ...base,
        date: null,
        startDate: f.startDate,
        endDate: f.endDate || f.startDate,
        allDay: !spanHasTime,
        startTime: spanHasTime ? f.startTime : null,
        endTime: spanHasTime && f.endTime ? f.endTime : null,
        recurrence: null,
      }
    }
    const hasTime = Boolean(f.startTime)
    return {
      ...base,
      date: f.date,
      startDate: null,
      endDate: null,
      allDay: !hasTime,
      startTime: hasTime ? f.startTime : null,
      endTime: hasTime && f.endTime ? f.endTime : null,
      recurrence: f.recurrence,
    }
  }

  const handleRepeatToggle = () => {
    setForm(f => ({
      ...f,
      recurrence: f.recurrence ? null : { freq: 'weekly', interval: 1, until: null },
    }))
  }

  const handleRecurrenceChange = patch => {
    setForm(f => ({ ...f, recurrence: { ...f.recurrence, ...patch } }))
  }

  const [localInterval, setLocalInterval] = useState('')
  const [prevInterval, setPrevInterval] = useState(form.recurrence?.interval)
  if (form.recurrence && form.recurrence.interval !== prevInterval) {
    setLocalInterval(String(form.recurrence.interval))
    setPrevInterval(form.recurrence.interval)
  }

  const handleIntervalBlur = () => {
    let val = Number(localInterval)
    if (isNaN(val) || val < 1) val = 1
    handleRecurrenceChange({ interval: val })
    setLocalInterval(String(val))
  }

  const valid = rawTitle.trim() && (form.multiDay ? form.startDate : form.date)

  const submit = () => {
    if (!valid) return
    const finalForm = rawTitle !== form.title ? parseTitle(rawTitle) : form
    const payload = buildPayload(finalForm)
    if (event) updateEvent(event.id, payload)
    else addEvent(payload)
    onOpenChange(false)
  }

  const remove = () => {
    if (event) {
      if (event.googleEventId) void pushEventDeletion(event.googleEventId)
      deleteEvent(event.id)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? t.editEvent : t.newEvent}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t.eventTitle}</Label>
            <div className="relative">
              <Input autoFocus value={rawTitle} onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                className={speechSupported ? 'pr-9' : undefined} />
              {speechSupported && (
                <Button type="button" variant="ghost" size="icon-sm"
                  className={`absolute right-0.5 top-0.5 ${isListening ? 'text-primary' : 'text-muted-foreground'}`}
                  aria-label={isListening ? t.voiceInputStopAria : t.voiceInputAria}
                  onClick={() => (isListening ? stopListening() : startListening())}>
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t.eventMultiDay}</Label>
            <Switch checked={form.multiDay} onCheckedChange={v => set({ multiDay: v })} />
          </div>
          {form.multiDay ? (
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label>{t.eventDate}</Label>
                <Input type="date" value={form.startDate} onChange={e => set({ startDate: e.target.value })} />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label>{t.eventRange}</Label>
                <Input type="date" value={form.endDate} min={form.startDate} onChange={e => set({ endDate: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>{t.eventDate}</Label>
                <Input type="date" value={form.date} onChange={handleDateChange} />
              </div>

              <button type="button" onClick={handleRepeatToggle}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{t.repeat}</span>
                  <span className="text-muted-foreground">
                    {form.recurrence
                      ? <CircleCheck className="h-4 w-4 text-primary" />
                      : <Circle className="h-4 w-4" />}
                  </span>
                </span>
              </button>

              {form.recurrence && (
                <div className="grid grid-cols-2 gap-3 p-3 mt-1.5 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="space-y-1.5">
                    <Label>{t.repeatFreqLabel}</Label>
                    <Select value={form.recurrence.freq} onValueChange={v => handleRecurrenceChange({ freq: v })}>
                      <SelectTrigger className="bg-background">
                        <span>{{ daily: t.repeatFreqDaily, weekly: t.repeatFreqWeekly, monthly: t.repeatFreqMonthly }[form.recurrence.freq]}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t.repeatFreqDaily}</SelectItem>
                        <SelectItem value="weekly">{t.repeatFreqWeekly}</SelectItem>
                        <SelectItem value="monthly">{t.repeatFreqMonthly}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.repeatEvery(form.recurrence.freq)}</Label>
                    <Input type="number" min="1" value={localInterval}
                      onChange={e => setLocalInterval(e.target.value)}
                      onBlur={handleIntervalBlur}
                      className="bg-background" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>{t.repeatUntil}</Label>
                    <Input type="date" value={form.recurrence.until ?? ''}
                      onChange={e => handleRecurrenceChange({ until: e.target.value || null })}
                      className="bg-background" />
                  </div>
                </div>
              )}
            </>
          )}
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>{form.multiDay ? t.eventStartTimeFirstDay : t.eventStartTime}</Label>
              <Input type="time" value={form.startTime} onChange={handleStartTimeChange} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>{form.multiDay ? t.eventEndTimeLastDay : t.eventEndTime}</Label>
              <Input type="time" value={form.endTime} min={form.multiDay ? undefined : form.startTime}
                onChange={handleEndTimeChange} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.eventColor}</Label>
            <ClassColorDot color={form.color} onChange={c => set({ color: c })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.eventNote}</Label>
            <Input value={form.note} placeholder={t.eventNotePlaceholder} onChange={e => set({ note: e.target.value })} />
          </div>
          {googleCalendarEnabled && (
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.eventSyncToGoogle}</Label>
                <p className="text-xs text-muted-foreground">{t.eventSyncToGoogleDesc}</p>
              </div>
              <Switch checked={form.syncToGoogle} onCheckedChange={v => set({ syncToGoogle: v })} />
            </div>
          )}
        </div>
        <DialogFooter>
          {event && (
            <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 sm:mr-auto" onClick={remove}>
              {t.delete}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button disabled={!valid} onClick={submit}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
