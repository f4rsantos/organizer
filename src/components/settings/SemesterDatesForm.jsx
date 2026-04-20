import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { computeWeekCount } from '@/lib/semesterUtils'

export function SemesterDatesForm({ onAdded }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const addSemester = useStore(s => s.addSemester)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const weekCount = form.startDate && form.endDate ? computeWeekCount(form.startDate, form.endDate) : null

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    const id = addSemester(form)
    onAdded?.(id)
    setForm({ name: '', startDate: '', endDate: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.semesterName}</Label>
        <Input placeholder="e.g. 2025/26 S1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t.startDate}</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.endDate}</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      {weekCount && <p className="text-xs text-muted-foreground">{t.weeks(weekCount)}</p>}
      <Button type="submit" className="w-full">{t.addSemester}</Button>
    </form>
  )
}
