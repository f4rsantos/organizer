import { CheckSquare, Kanban, GraduationCap, CalendarDays, Timer, Settings } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'

const TAB_IDS = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings']
const TAB_ICONS = { tasks: CheckSquare, kanban: Kanban, grades: GraduationCap, calendar: CalendarDays, focus: Timer, settings: Settings }

function useTabs() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  return TAB_IDS
    .filter(id => !(workMode && id === 'grades'))
    .map(id => ({ id, label: t[id], icon: TAB_ICONS[id] }))
}

export function TabBar({ activeTab, onTabChange }) {
  const tabs = useTabs()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center md:hidden">
      <div className="flex w-full border-t border-border bg-background/90 backdrop-blur-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors duration-150',
              activeTab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}>
            <Icon className={cn('h-5 w-5 transition-transform duration-150', activeTab === id && 'scale-110')} />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export function SideBar({ activeTab, onTabChange, open, onToggle }) {
  const tabs = useTabs()

  if (!open) {
    return (
      <nav className="hidden md:flex flex-col items-center gap-1 w-10 shrink-0 pt-8">
        {tabs.map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => onTabChange(id)}
            className={cn('flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-150',
              activeTab === id ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
            )}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <div className="flex-1 cursor-pointer w-full" onClick={onToggle} />
      </nav>
    )
  }

  return (
    <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0 pt-8 px-4">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => onTabChange(id)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-left',
            activeTab === id
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}>
          <Icon className={cn('h-4 w-4 shrink-0', activeTab === id && 'text-primary')} />
          {label}
        </button>
      ))}
      <div className="flex-1 cursor-pointer" onClick={onToggle} />
    </nav>
  )
}
