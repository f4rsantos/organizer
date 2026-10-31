import { notesApp } from './notes'
import { quickActionApp } from './quickAction'
import { standbyApp } from './standby'
import { eiCalendarApp } from './eiCalendar'
import { eisenhowerApp } from './eisenhower'
import { googleCalendarApp } from './googleCalendar'
import { habitsApp } from './habits'
import { pomodoroApp } from './pomodoro'
import { aiAssistantApp } from './aiAssistant'
import { breakActivityApp } from './breakActivity'
import { classesPanelApp } from './classesPanel'
import { todayApp } from './today'

export const APP_PLUGINS = [todayApp, notesApp, standbyApp, eiCalendarApp, eisenhowerApp, googleCalendarApp, habitsApp, quickActionApp, pomodoroApp, breakActivityApp, classesPanelApp, aiAssistantApp]

export const ONBOARDING_APP_IDS = ['notes', 'standby', 'eiCalendar', 'eisenhower', 'habits', 'quickAction', 'pomodoro', 'breakActivity']

export function onboardingApps(state, plugins = APP_PLUGINS) {
  return plugins.filter(p => ONBOARDING_APP_IDS.includes(p.id) && p.setEnabled && (!p.isVisible || p.isVisible(state)))
}

export function getAppTabs() {
  return APP_PLUGINS.filter(p => p.tab).map(p => p.tab)
}

export function getAppById(id) {
  return APP_PLUGINS.find(p => p.id === id) ?? null
}

export const CALENDAR_PROVIDERS = APP_PLUGINS.filter(p => p.useCalendarEvents)
