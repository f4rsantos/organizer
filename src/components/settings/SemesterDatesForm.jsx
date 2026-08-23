import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { computeWeekCount } from '@/lib/semesterUtils'

const EMPTY_FORM = { name: '', startDate: '', endDate: '' }

const formOf = semester => semester
  ? {
      name: semester.name ?? '',
      startDate: semester.startDate ?? '',
      endDate: semester.endDate ?? '',
    }
  : EMPTY_FORM

export function SemesterDatesForm({ onAdded, semester }) {
  const [form, setForm] = useState(() => formOf(semester))
  const addSemester = useStore(s => s.addSemester)
  const updateSemester = useStore(s => s.updateSemester)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const editing = !!semester

  const [seededId, setSeededId] = useState(semester?.id ?? null)
  if ((semester?.id ?? null) !== seededId) {
    setSeededId(semester?.id ?? null)
    setForm(formOf(semester))
  }

  const weekCount = form.startDate && form.endDate ? computeWeekCount(form.startDate, form.endDate) : null

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return
    if (editing) {
      updateSemester(semester.id, form)
      return
    }
    const id = addSemester(form)
    onAdded?.(id)
    setForm(EMPTY_FORM)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.semesterName}</Label>
        <Input placeholder="e.g. 2025/26 S1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <Label>{t.startDate}</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>{t.endDate}</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
      {weekCount && <p className="text-xs text-muted-foreground">{t.weeks(weekCount)}</p>}
      <Button type="submit" className="w-full">{editing ? t.save : t.addSemester}</Button>
    </form>
  )
}
