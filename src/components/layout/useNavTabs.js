import { CheckSquare, Kanban, GraduationCap, CalendarDays, Timer, Settings, StickyNote, Plus, Folder, FolderOpen, Star, Heart, Bookmark, Grid3x3, MoreHorizontal } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getAppTabs, getAppById } from '@/apps/registry'

const ADD_ID = '__add__'
const TAB_ICONS = { tasks: CheckSquare, kanban: Kanban, grades: GraduationCap, calendar: CalendarDays, focus: Timer, settings: Settings, notes: StickyNote, [ADD_ID]: Plus }
const FOLDER_ICONS = { more: MoreHorizontal, folder: Folder, folderOpen: FolderOpen, star: Star, heart: Heart, bookmark: Bookmark, grid: Grid3x3 }
const DEFAULT_ORDER = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings']

export function useNavTabs() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const state = useStore(s => s)
  const navbar = useStore(s => s.settings?.navbar)
  const hideGrades = workMode || noneMode
  const showAddButton = Boolean(navbar?.showAddButton)
  const labelMode = navbar?.labelMode ?? 'both'
  const folderDefs = Array.isArray(navbar?.folders) ? navbar.folders : []

  const allAppTabs = getAppTabs()
  const optionalTabIds = new Set(allAppTabs.map(pt => pt.id))
  const enabledAppIds = new Set(allAppTabs.filter(pt => getAppById(pt.id)?.isEnabled(state)).map(pt => pt.id))
  const pluginTabs = allAppTabs.filter(pt => !DEFAULT_ORDER.includes(pt.id))
  const pluginIcons = Object.fromEntries(pluginTabs.map(pt => [pt.id, getAppById(pt.id)?.icon]))
  const pluginLabelKeys = Object.fromEntries(allAppTabs.map(pt => [pt.id, getAppById(pt.id)?.labelKey ?? pt.id]))

  let order = navbar?.order?.length ? [...navbar.order] : [...DEFAULT_ORDER]
  const insertBeforeSettings = id => {
    if (order.includes(id)) return
    const i = order.indexOf('settings')
    if (i === -1) order.push(id)
    else order.splice(i, 0, id)
  }
  if (showAddButton) insertBeforeSettings(ADD_ID)
  for (const id of enabledAppIds) if (!DEFAULT_ORDER.includes(id)) insertBeforeSettings(id)

  const hidden = new Set(navbar?.hidden ?? [])
  const inFolder = new Set(folderDefs.flatMap(f => f.children ?? []))

  const customNames = navbar?.customNames ?? {}

  const labelFor = id => (id === ADD_ID ? t.add : (customNames[id] || t[pluginLabelKeys[id] ?? id]))
  const build = id => ({ id, label: labelFor(id), icon: TAB_ICONS[id] ?? pluginIcons[id], isAdd: id === ADD_ID })
  const isVisible = id =>
    (!optionalTabIds.has(id) || enabledAppIds.has(id))
    && (id !== ADD_ID || showAddButton)
    && !hidden.has(id)
    && !(hideGrades && id === 'grades')
  const visible = order.filter(isVisible)

  const folders = folderDefs.map(f => ({
    id: f.id,
    label: f.label,
    iconKey: f.icon ?? 'folder',
    icon: FOLDER_ICONS[f.icon] ?? Folder,
    isFolder: true,
    items: (f.children ?? []).filter(isVisible).map(build),
  })).filter(f => f.items.length > 0)

  return {
    primary: visible.filter(id => !inFolder.has(id)).map(build),
    folders,
    showAddButton,
    labelMode,
  }
}

export { TAB_ICONS, FOLDER_ICONS, DEFAULT_ORDER, ADD_ID }
