import { useCallback, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { weatherCategory } from '@/lib/weather'
import { dailyGreeting, dailyMotivation } from '@/lib/today/dailyPhrases'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { isPending } from '@/lib/habits'
import { dayNotes } from '@/lib/today/dayNotes'
import { NotesCard } from './NotesCard'
import { useStrings } from '@/lib/strings'
import { longDate } from '@/lib/dateLabels'
import { buildTodayBrief, holidayToday } from '@/lib/today/todayBrief'
import { buildHighlights, layoutToday } from '@/lib/today/highlights'
import { buildRecommendations } from '@/lib/today/recommendations'
import { useStudyCalendar } from '@/hooks/useStudyCalendar'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { CalendarEventProviders } from '@/apps/CalendarEventProviders'
import { AmbientGlow } from '@/components/common/GlassPanel'
import { useClassesSettings } from '@/apps/classesPanel/useClassesSettings'
import { BriefHeadline } from './BriefHeadline'
import { RecommendationCard, ScheduleCard, UpcomingCard } from './TodayCards'
import { TodayWeather } from './TodayWeather'
import { useTodaySettings } from './useTodaySettings'

const HEADLINE_GRID = { 1: '', 2: 'grid-cols-2', 3: 'grid-cols-3' }
const MAX_UPCOMING = 5

function greetingFor(t, { today, forecastDay, name }) {
  const category = forecastDay ? weatherCategory(forecastDay.code) : null
  const phrase = dailyGreeting(t, { today, hour: new Date().getHours(), weatherCategory: category })
  return name ? `${t.todayHello(name)} ${phrase ?? ''}`.trim() : phrase
}

function useHabitsPending() {
  const enabled = useStore(s => s.settings?.apps?.habits === true)
  const habits = useStore(s => s.habits)
  if (!enabled) return 0
  const now = new Date()
  return (habits ?? []).filter(habit => isPending(habit, now)).length
}

function useProviderEvents() {
  const [byProvider, setByProvider] = useState({})
  const onEvents = useCallback((id, events) => {
    setByProvider(prev => (prev[id] === events ? prev : { ...prev, [id]: events }))
  }, [])
  const events = useMemo(() => Object.values(byProvider).flat(), [byProvider])
  return { events, onEvents }
}

function countOf(items, kind) {
  return items.find(item => item.kind === kind)?.count ?? 0
}

function useAllScopedTasks(scopeId, mergedTasks) {
  const tasks = useStore(s => s.tasks)
  return useMemo(() => {
    const listed = new Set(mergedTasks.map(task => task.id))
    const boardOnly = (tasks ?? []).filter(task => (task.semesterId ?? null) === scopeId && !listed.has(task.id))
    return [...mergedTasks, ...boardOnly]
  }, [tasks, scopeId, mergedTasks])
}

export function TodayTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const lessons = useStore(s => s.lessons)
  const kanban = useStore(s => s.kanban)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const classesPanelEnabled = useStore(s => s.settings?.apps?.classesPanel === true)
  const setActiveTab = useStore(s => s.setActiveTab)
  const settings = useTodaySettings()
  const { studySteps } = useClassesSettings()
  const scopeId = noneMode ? null : activeSemesterId
  const tasks = useMergedTasks(scopeId)
  const allTasks = useAllScopedTasks(scopeId, tasks)
  const provider = useProviderEvents()
  const { today, nowTime, classes, holidays, events } = useStudyCalendar(provider.events)

  const items = useMemo(
    () => buildTodayBrief({ today, nowTime, classes, events, tasks, lessons, holidays, studyTypes: studySteps }),
    [today, nowTime, classes, events, tasks, lessons, holidays, studySteps],
  )
  const highlights = useMemo(
    () => buildHighlights({ today, classes, events, tasks: allTasks, kanban, sources: settings.highlightSources }),
    [today, classes, events, allTasks, kanban, settings.highlightSources],
  )
  const layout = layoutToday({ brief: items, highlights, count: settings.headlineCount })
  const { headlines } = layout
  const upcoming = layout.upcoming.slice(0, MAX_UPCOMING)
  const recommendations = buildRecommendations({
    today, prefs: settings.recommend, items: layout.recommendationItems, tasks: allTasks, kanban, excludeIds: layout.excludeIds,
  })
  const lessonsToday = items.find(item => item.kind === 'classesToday')?.lessons ?? []
  const eventsToday = items.find(item => item.kind === 'eventsToday')?.events ?? []
  const navigation = { classesPanelEnabled, onNavigate: setActiveTab }
  const forecast = useWeatherForecast()
  const forecastDay = forecast?.find(day => day.date === today) ?? null
  const habitsPending = useHabitsPending()
  const greeting = greetingFor(t, { today, forecastDay, name: settings.name })
  const notes = settings.showNotes
    ? dayNotes({ forecastDay: settings.showWeather ? forecastDay : null, holiday: holidayToday(holidays, today), habitsPending })
    : []
  const motivation = settings.showMotivation ? dailyMotivation(t, today) : null

  return (
    <div className="relative h-tab-pane overflow-y-auto">
      <CalendarEventProviders onEvents={provider.onEvents} />
      <AmbientGlow />
      <div className="relative mx-auto max-w-3xl space-y-5 px-4 pt-10 pb-10 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-3xl font-semibold tracking-tight">{longDate(t, today)}</h1>
            {motivation && <p className="text-sm italic text-muted-foreground">{motivation}</p>}
          </div>
          {settings.showWeather && <TodayWeather today={today} />}
        </header>
        {headlines.length > 0 && (
          <div className={cn('grid gap-3', HEADLINE_GRID[headlines.length])}>
            {headlines.map((item, index) => (
              <BriefHeadline key={`${item.kind}-${index}`} t={t} item={item} compact={headlines.length > 1} {...navigation} />
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {settings.showSchedule && (
            <ScheduleCard t={t} lessons={lessonsToday} events={eventsToday} tasksDue={countOf(items, 'tasksDue')} overdue={countOf(items, 'overdue')} />
          )}
          {notes.length > 0 && <NotesCard t={t} notes={notes} />}
          {settings.showUpcoming && upcoming.length > 0 && <UpcomingCard t={t} items={upcoming} />}
          {recommendations.map(rec => <RecommendationCard key={rec.kind} t={t} rec={rec} {...navigation} />)}
        </div>
      </div>
    </div>
  )
}
