import { notesApp } from './notes'
import { standbyApp } from './standby'
import { eiCalendarApp } from './eiCalendar'

export const APP_PLUGINS = [notesApp, standbyApp, eiCalendarApp]

export function getAppTabs() {
  return APP_PLUGINS.filter(p => p.tab).map(p => p.tab)
}

export function getAppById(id) {
  return APP_PLUGINS.find(p => p.id === id) ?? null
}

export const CALENDAR_PROVIDERS = APP_PLUGINS.filter(p => p.useCalendarEvents)
