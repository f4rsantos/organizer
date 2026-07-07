import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const EMPTY = { title: '', date: '', startDate: '', endDate: '', multiDay: false, color: '#6366f1', note: '' }

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
  }
}

export function EventForm({ open, onOpenChange, event, semesterId, defaultDate }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const addEvent = useStore(s => s.addEvent)
  const updateEvent = useStore(s => s.updateEvent)
  const deleteEvent = useStore(s => s.deleteEvent)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (!open) return
    if (event) setForm(formFromEvent(event))
    else setForm({ ...EMPTY, date: defaultDate ?? '' })
  }, [open, event, defaultDate])

  const set = patch => setForm(f => ({ ...f, ...patch }))

  const buildPayload = () => {
    const base = { title: form.title.trim(), color: form.color, note: form.note.trim(), allDay: true, semesterId: semesterId ?? null }
    if (form.multiDay) return { ...base, date: null, startDate: form.startDate, endDate: form.endDate || form.startDate }
    return { ...base, date: form.date, startDate: null, endDate: null }
  }

  const valid = form.title.trim() && (form.multiDay ? form.startDate : form.date)

  const submit = () => {
    if (!valid) return
    if (event) updateEvent(event.id, buildPayload())
    else addEvent(buildPayload())
    onOpenChange(false)
  }

  const remove = () => {
    if (event) deleteEvent(event.id)
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
            <Input autoFocus value={form.title} onChange={e => set({ title: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') submit() }} />
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
            <div className="flex flex-col gap-1.5">
              <Label>{t.eventDate}</Label>
              <Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t.eventColor}</Label>
            <ClassColorDot color={form.color} onChange={c => set({ color: c })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t.eventNote}</Label>
            <Input value={form.note} placeholder={t.eventNotePlaceholder} onChange={e => set({ note: e.target.value })} />
          </div>
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
