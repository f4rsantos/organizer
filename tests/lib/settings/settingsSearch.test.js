import { describe, it, expect } from 'vitest'
import { searchSettings, parseSettingsIntent } from '../../../src/lib/settings/settingsSearch.js'
import { en } from '../../../src/lib/strings/en.js'
import { pt } from '../../../src/lib/strings/pt.js'

const ptStrings = { ...en, ...pt }
const APPS = [
  { id: 'habits', labelKey: 'habits', keywords: ['habit', 'streak'] },
  { id: 'notes', labelKey: 'notes', keywords: ['notes', 'markdown'] },
]

const topIds = (query, options = {}) =>
  searchSettings(query, { t: en, apps: APPS, ...options }).slice(0, 3).map(r => r.id)

describe('settings search', () => {
  it('finds a setting by its own label', () => {
    expect(topIds('first day of week')[0]).toBe('weekStartDay')
  })

  it('understands a question phrased in plain English', () => {
    expect(topIds('how do I make the week start on monday?')[0]).toBe('weekStartDay')
  })

  it('maps everyday words onto the setting that does the job', () => {
    expect(topIds('back up my data')).toContain('exportJson')
  })

  it('finds an app by the search words of the current language', () => {
    const apps = [{ id: 'classesPanel', labelKey: 'classesPanel', keywordsKey: 'classesPanelKeywords' }]
    const ids = searchSettings('matéria', { t: ptStrings, apps }).map(r => r.id)
    expect(ids).toContain('app:classesPanel')
  })

  it('tolerates a typo', () => {
    expect(topIds('notifcations')[0]).toBe('notificationBell')
  })

  it('searches the labels of the language the app is in', () => {
    const ids = searchSettings(ptStrings.weekStartDay, { t: ptStrings, apps: APPS }).map(r => r.id)
    expect(ids[0]).toBe('weekStartDay')
  })

  it('finds apps by their keywords', () => {
    expect(topIds('streak')[0]).toBe('app:habits')
  })

  it('leaves out sections that are not available right now', () => {
    const ids = searchSettings('grade scale', { t: en, apps: APPS, sections: new Set(['tasks', 'general']) }).map(r => r.id)
    expect(ids).not.toContain('gradeScale')
  })

  it('returns nothing for filler words alone', () => {
    expect(searchSettings('how do I', { t: en, apps: APPS })).toEqual([])
  })
})

describe('settings intents', () => {
  it('reads a request to switch to the dark theme', () => {
    expect(parseSettingsIntent('turn on dark mode', { apps: APPS, t: en })).toEqual({ type: 'theme', value: 'dark' })
  })

  it('reads a request to change the language by its native name', () => {
    expect(parseSettingsIntent('change language to português', { apps: APPS, t: en })).toEqual({ type: 'lang', value: 'pt' })
  })

  it('reads a request to change the language by its English name', () => {
    expect(parseSettingsIntent('switch to german', { apps: APPS, t: en })).toEqual({ type: 'lang', value: 'de' })
  })

  it('reads a request to enable an app', () => {
    expect(parseSettingsIntent('enable habits', { apps: APPS, t: en })).toEqual({ type: 'app', appId: 'habits' })
  })

  it('does not treat a plain search as an action', () => {
    expect(parseSettingsIntent('first day of week', { apps: APPS, t: en })).toBe(null)
  })
})
