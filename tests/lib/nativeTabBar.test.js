import { describe, it, expect } from 'vitest'
import { buildNativeTabBarSpec } from '../../src/lib/nativeTabBar'
import { addPickerActionIds } from '../../src/lib/navAddActions'

const t = { add: 'Add', addTask: 'Add task', addCard: 'Add card', addEvent: 'Add event', notesNew: 'New note', quickAction: 'Quick action' }

function spec(overrides = {}) {
  return buildNativeTabBarSpec({
    items: [],
    activeTab: 'tasks',
    labelMode: 'both',
    placement: 'bottom',
    theme: 'system',
    tint: null,
    addAction: 'task',
    addActionIds: [],
    t,
    visible: true,
    ...overrides,
  })
}

describe('native tab bar spec', () => {
  it('maps core tabs to SF Symbols so the native bar shows real icons', () => {
    const { items } = spec({ items: [{ id: 'calendar', label: 'Calendar' }] })
    expect(items[0]).toMatchObject({ id: 'calendar', label: 'Calendar', symbol: 'calendar', kind: 'tab' })
  })

  it('falls back to a generic symbol for a plugin tab it does not know', () => {
    const { items } = spec({ items: [{ id: 'someNewApp', label: 'New' }] })
    expect(items[0].symbol).toBe('square.grid.2x2')
  })

  it('sends folders with their children so native can render them as a menu', () => {
    const folder = { id: 'f1', label: 'More', iconKey: 'more', isFolder: true, items: [{ id: 'focus', label: 'Focus' }, { id: 'settings', label: 'Settings' }] }
    const { items } = spec({ items: [folder] })
    expect(items[0]).toMatchObject({ id: 'f1', kind: 'folder', symbol: 'ellipsis' })
    expect(items[0].children.map(c => [c.id, c.symbol])).toEqual([['focus', 'timer'], ['settings', 'gearshape']])
  })

  it('keeps an add button that lives inside a folder reachable from the native menu', () => {
    const folder = { id: 'f1', label: 'More', iconKey: 'folder', isFolder: true, items: [{ id: 'focus', label: 'Focus' }, { id: '__add__', label: 'Add', isAdd: true }] }
    const { items } = spec({ items: [folder] })
    expect(items[0].children.map(c => [c.id, c.symbol])).toEqual([['focus', 'timer'], ['__add__', 'plus']])
  })

  it('gives the add button a picker menu only when the picker is configured', () => {
    const add = { id: '__add__', label: 'Add', isAdd: true }
    const direct = spec({ items: [add], addAction: 'task', addActionIds: ['task', 'kanban'] })
    expect(direct.items[0]).toMatchObject({ kind: 'add', actions: [] })

    const picker = spec({ items: [add], addAction: 'picker', addActionIds: ['task', 'event'] })
    expect(picker.items[0].actions).toEqual([{ id: 'task', label: 'Add task' }, { id: 'event', label: 'Add event' }])
  })

  it('keeps the active tab selected', () => {
    expect(spec({ activeTab: 'kanban' }).selected).toBe('kanban')
  })
})

describe('add picker actions', () => {
  it('only offers notes and quick action when those apps are enabled', () => {
    expect(addPickerActionIds({ notesEnabled: false, quickActionEnabled: false })).toEqual(['task', 'kanban', 'event'])
    expect(addPickerActionIds({ notesEnabled: true, quickActionEnabled: true })).toEqual(['task', 'kanban', 'event', 'note', 'quickaction'])
  })
})
