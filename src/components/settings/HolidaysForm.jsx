import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { useStrings } from '@/lib/strings'

export function HolidaysForm({ semesterId }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const holidays = useStore(useShallow(s => (s.holidays ?? []).filter(h => h.semesterId === semesterId)))
  const addHoliday = useStore(s => s.addHoliday)
  const deleteHoliday = useStore(s => s.deleteHoliday)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    addHoliday(semesterId, form)
    setForm({ name: '', startDate: '', endDate: '' })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t.holidayName}</Label>
          <Input placeholder={t.holidayNamePlaceholder} value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t.startDate}</Label>
            <Input type="date" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.endDate}</Label>
            <Input type="date" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        <Button type="submit" className="w-full">{t.addHoliday}</Button>
      </form>

      {holidays.length > 0 && (
        <div className="space-y-2">
          {holidays.map(h => (
            <div key={h.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{h.name}</span>
                <span className="ml-2 text-muted-foreground">{h.startDate}{h.startDate !== h.endDate ? ` → ${h.endDate}` : ''}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteHoliday(h.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
