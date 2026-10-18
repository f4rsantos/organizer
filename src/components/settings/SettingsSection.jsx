import {
  BookOpen, Bell, CalendarDays, CalendarRange, Database, GraduationCap, LayoutGrid, ListChecks,
  PanelBottom, SlidersHorizontal, SquareKanban, Timer, TreePalm,
} from 'lucide-react'
import { AccordionTrigger } from '@/components/ui/accordion'

const SECTION_ICONS = {
  semester: CalendarRange,
  classes: BookOpen,
  holidays: TreePalm,
  grades: GraduationCap,
  tasks: ListChecks,
  kanban: SquareKanban,
  calendar: CalendarDays,
  focus: Timer,
  notifications: Bell,
  general: SlidersHorizontal,
  navbar: PanelBottom,
  data: Database,
  apps: LayoutGrid,
}

export function SettingsGroup({ label, children }) {
  return (
    <section className="space-y-1.5">
      <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  )
}

export function SectionTrigger({ section, summary, children }) {
  const Icon = SECTION_ICONS[section]
  return (
    <AccordionTrigger className="items-center py-3 hover:no-underline">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-sm font-medium">{children}</span>
        {summary && <span className="ml-auto min-w-0 truncate pl-3 text-right text-xs font-normal text-muted-foreground">{summary}</span>}
      </span>
    </AccordionTrigger>
  )
}
