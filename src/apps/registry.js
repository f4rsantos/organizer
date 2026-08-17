import { notesApp } from './notes'
import { quickActionApp } from './quickAction'
import { standbyApp } from './standby'
import { eiCalendarApp } from './eiCalendar'
import { eisenhowerApp } from './eisenhower'
import { googleCalendarApp } from './googleCalendar'
import { habitsApp } from './habits'
import { pomodoroApp } from './pomodoro'

export const APP_PLUGINS = [notesApp, standbyApp, eiCalendarApp, eisenhowerApp, googleCalendarApp, habitsApp, quickActionApp, pomodoroApp]

export function getAppTabs() {
  return APP_PLUGINS.filter(p => p.tab).map(p => p.tab)
}

export function getAppById(id) {
  return APP_PLUGINS.find(p => p.id === id) ?? null
}

export const CALENDAR_PROVIDERS = APP_PLUGINS.filter(p => p.useCalendarEvents)
