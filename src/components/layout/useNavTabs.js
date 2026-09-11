import { CheckSquare, Kanban, GraduationCap, CalendarDays, Timer, Settings, StickyNote, Plus, Folder, FolderOpen, Star, Heart, Bookmark, Grid3x3, MoreHorizontal } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getAppTabs, getAppById } from '@/apps/registry'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { NAV_VISIBILITY_MODES } from '@/store/migrations'

const ADD_ID = '__add__'
const TAB_ICONS = { tasks: CheckSquare, kanban: Kanban, grades: GraduationCap, calendar: CalendarDays, focus: Timer, settings: Settings, notes: StickyNote, [ADD_ID]: Plus }
const FOLDER_ICONS = { more: MoreHorizontal, folder: Folder, folderOpen: FolderOpen, star: Star, heart: Heart, bookmark: Bookmark, grid: Grid3x3 }
const DEFAULT_ORDER = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings']

export function useNavTabs() {
  const isDesktop = useIsDesktopLayout()
  const surface = isDesktop ? 'desktop' : 'mobile'
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

  const visibility = navbar?.visibility ?? {}
  const visibleOn = id => {
    const mode = visibility[id] ?? 'both'
    return mode === 'both' || mode === surface
  }

  const customNames = navbar?.customNames ?? {}

  const labelFor = id => (id === ADD_ID ? t.add : (customNames[id] || t[pluginLabelKeys[id] ?? id]))
  const build = id => ({ id, label: labelFor(id), icon: TAB_ICONS[id] ?? pluginIcons[id], isAdd: id === ADD_ID })
  const folderById = new Map(folderDefs.map(f => [f.id, f]))
  const folderOf = new Map(folderDefs.flatMap(f => (f.children ?? []).map(id => [id, f.id])))
  const folderVisibleOn = fid => {
    const mode = visibility[fid] ?? 'both'
    return mode === 'both' || mode === surface
  }
  // A tab is absorbed by its folder only while that folder is itself visible on
  // this surface. When the folder is hidden here, its children fall back to
  // being rendered inline, subject to their own visibility.
  const inVisibleFolder = id => {
    const fid = folderOf.get(id)
    return fid !== undefined && folderById.has(fid) && folderVisibleOn(fid)
  }

  const isVisible = id =>
    (!optionalTabIds.has(id) || enabledAppIds.has(id))
    && (id !== ADD_ID || showAddButton)
    && visibleOn(id)
    && !(hideGrades && id === 'grades')
  const visible = order.filter(isVisible)

  const folders = folderDefs.filter(folderVisibleOn).map(f => {
    const childrenSet = new Set(f.children ?? [])
    const orderedChildren = order.filter(id => childrenSet.has(id))
    const remainingChildren = (f.children ?? []).filter(id => !order.includes(id))
    return {
      id: f.id,
      label: f.label,
      iconKey: f.icon ?? 'folder',
      icon: FOLDER_ICONS[f.icon] ?? Folder,
      isFolder: true,
      items: [...orderedChildren, ...remainingChildren].filter(isVisible).map(build),
    }
  }).filter(f => f.items.length > 0)

  const renderedFolders = new Map(folders.map(f => [f.id, f]))
  const items = []
  for (const id of order) {
    if (renderedFolders.has(id)) items.push(renderedFolders.get(id))
    else if (isVisible(id) && !inVisibleFolder(id)) items.push(build(id))
  }
  for (const f of folders) if (!order.includes(f.id)) items.push(f)

  return {
    items,
    primary: visible.filter(id => !inVisibleFolder(id)).map(build),
    folders,
    showAddButton,
    labelMode,
  }
}

export { TAB_ICONS, FOLDER_ICONS, DEFAULT_ORDER, ADD_ID, NAV_VISIBILITY_MODES }
