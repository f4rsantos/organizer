import { useState } from 'react'
import { ArrowDown, ArrowUp, ListChecks, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PillSwitch } from '@/components/common/PillSwitch'
import { GlassPanel } from '@/components/common/GlassPanel'
import { GradeProgressBar } from '@/components/grades/GradeProgressBar'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { shortDate } from '@/lib/dateLabels'
import { lessonTableRows } from '@/lib/classes/lessonTable'
import { OTHER_LESSON_TYPE } from '@/lib/classes/classEvents'
import { LessonSheet } from './LessonSheet'
import { lessonTypeLabel, progressColor, studyTypeLabel } from './labels'

const DEFAULT_SORT = { key: 'date', dir: 'desc' }
const FULL_SCALE = 1

function percent(pct) {
  return `${Math.round(pct * 100)}%`
}

function CompactSelect({ value, onChange, options, className }) {
  return (
    <Select value={value} onValueChange={onChange} items={options}>
      <SelectTrigger className={cn('h-8 w-auto max-w-full gap-2 whitespace-nowrap text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} sideOffset={4}>
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function ClassProgressStrip({ summaries, activeId, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {summaries.map(({ cls, progress }) => {
        const active = activeId === cls.id
        return (
          <button key={cls.id} type="button" aria-pressed={active} onClick={() => onSelect(active ? 'all' : cls.id)}
            className={cn('rounded-2xl border bg-card/70 p-3 text-left transition-colors',
              active ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40')}>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cls.color }} />
              <span className="min-w-0 flex-1 truncate">{cls.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{percent(progress.pct)}</span>
            </span>
            <span className="mt-2 block">
              <GradeProgressBar score={progress.pct} scale={FULL_SCALE} color={progressColor(progress.pct, cls.color)} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SortHeader({ label, sortKey, sort, onSort, className }) {
  const active = sort.key === sortKey
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown
  const next = active && sort.dir === 'desc' ? 'asc' : 'desc'
  return (
    <th className={cn('px-3 py-2 text-left font-medium', className)}>
      <button type="button" onClick={() => onSort({ key: sortKey, dir: next })}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}>
        {label}
        {active && <Arrow className="h-3 w-3" />}
      </button>
    </th>
  )
}

function CellInput({ value, placeholder, onSave, className }) {
  return (
    <input defaultValue={value ?? ''} placeholder={placeholder}
      onBlur={e => { if (e.target.value.trim() !== (value ?? '')) onSave(e.target.value.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className={cn('w-full rounded-md bg-transparent px-1.5 py-1 outline-none transition-colors placeholder:text-muted-foreground/50 hover:bg-accent/40 focus:bg-accent/60', className)} />
  )
}

function AddLessonMenu({ t, summaries, classId, onAdd }) {
  if (classId !== 'all') {
    return (
      <Button size="sm" variant="outline" onClick={() => onAdd(classId)}>
        <Plus />{t.classesAddLesson}
      </Button>
    )
  }
  const options = summaries.map(({ cls }) => ({ value: cls.id, label: cls.name }))
  return (
    <Select value={null} onValueChange={onAdd} items={options}>
      <SelectTrigger className="h-8 w-auto gap-2 whitespace-nowrap text-xs">
        <Plus className="h-3.5 w-3.5" />
        <SelectValue placeholder={t.classesAddLesson} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} sideOffset={4}>
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function typeOptions(t, lessonTypes, current) {
  const known = lessonTypes.some(entry => entry.id === current)
  const entries = known ? lessonTypes : [...lessonTypes, { id: current }]
  return entries.map(({ id }) => ({ value: id, label: lessonTypeLabel(t, id, lessonTypes) }))
}

function LessonTableRow({ t, row, studySteps, lessonTypes, onPatch, onOpen }) {
  const { cls, session, progress } = row
  return (
    <tr className="group border-t border-border/60 transition-colors hover:bg-accent/20">
      <td className="px-2 py-1.5">
        <CellInput key={`${session.key}:n:${session.number ?? ''}`} value={session.number} placeholder="—"
          onSave={number => onPatch({ number })} className="w-14 tabular-nums" />
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-muted-foreground">{shortDate(t, session.date)}</td>
      <td className="max-w-[9rem] px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cls.color }} />
          <span className="truncate">{cls.name}</span>
        </span>
      </td>
      <td className="px-2 py-1.5">
        <CompactSelect value={session.type} onChange={type => onPatch({ type })}
          options={typeOptions(t, lessonTypes, session.type)} className="border-transparent bg-transparent shadow-none hover:bg-accent/40" />
      </td>
      <td className="px-2 py-1.5">
        <span className="flex items-center gap-1">
          <CellInput key={`${session.key}:${session.theme}`} value={session.theme} placeholder={t.classesThemePlaceholder}
            onSave={theme => onPatch({ theme })} className="min-w-[10rem]" />
          <Button variant="ghost" size="icon" onClick={onOpen} title={t.classesLessonDetails} aria-label={t.classesLessonDetails}
            className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 touch:opacity-100">
            <ListChecks className="h-3.5 w-3.5" />
          </Button>
        </span>
      </td>
      {studySteps.map(step => (
        <td key={step.id} className="px-3 py-1.5 text-center">
          <Checkbox className="mx-auto" checked={Boolean(session.studied?.[step.id])} aria-label={studyTypeLabel(t, step)}
            onCheckedChange={done => onPatch({ studied: { ...session.studied, [step.id]: done } })} />
        </td>
      ))}
      <td className="w-28 px-3 py-1.5">
        <GradeProgressBar score={progress} scale={FULL_SCALE} color={progressColor(progress, cls.color)} />
      </td>
    </tr>
  )
}

function useTableFilters() {
  const [classId, setClassId] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState(DEFAULT_SORT)
  return { classId, setClassId, type, setType, status, setStatus, sort, setSort }
}

export function ClassesTable({ t, summaries, studySteps, lessonTypes, today }) {
  const patchLessonSession = useStore(s => s.patchLessonSession)
  const addManualLesson = useStore(s => s.addManualLesson)
  const filters = useTableFilters()
  const [open, setOpen] = useState(null)
  const rows = lessonTableRows(summaries, studySteps, filters)
  const openRow = open && summaries.find(s => s.cls.id === open.classId)?.sessions.find(s => s.key === open.key)

  const filterTypes = [{ value: 'all', label: t.classesTypeAll }, ...lessonTypes.map(({ id }) => ({ value: id, label: lessonTypeLabel(t, id, lessonTypes) }))]
  const statusOptions = [
    { value: 'all', label: t.classesTypeAll },
    { value: 'pending', label: t.classesStatusPending },
    { value: 'done', label: t.classesStatusDone },
  ]
  const headerProps = { sort: filters.sort, onSort: filters.setSort }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t.classesPanel}</h1>
      <ClassProgressStrip summaries={summaries.filter(s => s.sessions.length > 0)} activeId={filters.classId} onSelect={filters.setClassId} />
      <div className="flex flex-wrap items-center gap-2">
        <CompactSelect value={filters.type} onChange={filters.setType} options={filterTypes} />
        <AddLessonMenu t={t} summaries={summaries} classId={filters.classId}
          onAdd={classId => addManualLesson(classId, { date: today, type: filters.type === 'all' ? OTHER_LESSON_TYPE : filters.type })} />
        <PillSwitch className="ml-auto w-60" options={statusOptions} value={filters.status} onChange={filters.setStatus} />
      </div>
      <GlassPanel className="w-max min-w-full overflow-visible">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <SortHeader label={t.classesColNumber} sortKey="number" {...headerProps} />
              <SortHeader label={t.classesColDate} sortKey="date" {...headerProps} />
              <SortHeader label={t.classesColClass} sortKey="class" {...headerProps} />
              <SortHeader label={t.classesColType} sortKey="type" {...headerProps} />
              <th className="px-3 py-2 text-left font-medium">{t.classesColTheme}</th>
              {studySteps.map(step => (
                <th key={step.id} className="max-w-[6rem] px-3 py-2 text-center font-medium">
                  <span className="block truncate" title={studyTypeLabel(t, step)}>{studyTypeLabel(t, step)}</span>
                </th>
              ))}
              <SortHeader label={t.classesColProgress} sortKey="progress" {...headerProps} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <LessonTableRow key={`${row.cls.id}:${row.session.key}`} t={t} row={row}
                studySteps={studySteps} lessonTypes={lessonTypes}
                onOpen={() => setOpen({ classId: row.cls.id, key: row.session.key })}
                onPatch={patch => patchLessonSession(row.cls.id, row.session.key, patch)} />
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">{t.classesNoMatches}</p>}
      </GlassPanel>
      {openRow && (
        <LessonSheet notesOnly t={t} classId={open.classId} session={openRow} studyTypes={studySteps} lessonTypes={lessonTypes}
          onClose={() => setOpen(null)} />
      )}
    </div>
  )
}
