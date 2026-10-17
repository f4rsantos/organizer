import { ADD_ACTION_LABEL_KEYS } from './navAddActions'

const TAB_SYMBOLS = {
  tasks: 'checkmark.square',
  kanban: 'rectangle.split.3x1',
  grades: 'graduationcap',
  calendar: 'calendar',
  focus: 'timer',
  settings: 'gearshape',
  notes: 'note.text',
  aiAssistant: 'sparkles',
  eiCalendar: 'calendar.day.timeline.left',
  eisenhower: 'square.grid.2x2',
  googleCalendar: 'calendar.badge.clock',
  habits: 'target',
  pomodoro: 'timer',
  quickAction: 'bolt',
  standby: 'iphone.landscape',
  __add__: 'plus',
}

const FOLDER_SYMBOLS = {
  more: 'ellipsis',
  folder: 'folder',
  folderOpen: 'folder',
  star: 'star',
  heart: 'heart',
  bookmark: 'bookmark',
  grid: 'square.grid.3x3',
}

const FALLBACK_SYMBOL = 'square.grid.2x2'

function tabEntry(item) {
  return { id: item.id, label: item.label, symbol: TAB_SYMBOLS[item.id] ?? FALLBACK_SYMBOL, kind: 'tab', children: [], actions: [] }
}

function folderEntry(item) {
  return {
    id: item.id,
    label: item.label,
    symbol: FOLDER_SYMBOLS[item.iconKey] ?? FOLDER_SYMBOLS.folder,
    kind: 'folder',
    children: (item.items ?? []).map(tabEntry),
    actions: [],
  }
}

function addEntry(item, { addAction, addActionIds, t }) {
  const actions = addAction === 'picker'
    ? addActionIds.map(id => ({ id, label: t[ADD_ACTION_LABEL_KEYS[id]] ?? id }))
    : []
  return { ...tabEntry(item), kind: 'add', actions }
}

export function buildNativeTabBarSpec({ items, activeTab, labelMode, placement, theme, tint, addAction, addActionIds, t, visible }) {
  const entryFor = item => {
    if (item.isFolder) return folderEntry(item)
    if (item.isAdd) return addEntry(item, { addAction, addActionIds, t })
    return tabEntry(item)
  }
  return {
    visible,
    placement,
    selected: activeTab,
    labelMode,
    theme,
    tint: tint ?? null,
    items: items.map(entryFor),
  }
}
