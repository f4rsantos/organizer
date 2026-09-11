import { nanoid } from '@/lib/ids'
import { GripVertical, Eye, EyeOff, Monitor, Smartphone, FolderPlus, X } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { TAB_ICONS, FOLDER_ICONS, DEFAULT_ORDER, ADD_ID } from '@/components/layout/useNavTabs'
import { getAppTabs, getAppById } from '@/apps/registry'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const NO_FOLDER = '__none__'

const VIS_CYCLE = { both: 'none', none: 'desktop', desktop: 'mobile', mobile: 'both' }
const VIS_ICONS = { both: Eye, none: EyeOff, desktop: Monitor, mobile: Smartphone }
const VIS_LABEL_KEYS = { both: 'navVisBoth', none: 'navVisNone', desktop: 'navVisDesktop', mobile: 'navVisMobile' }

function TabRow({ id, t, visibility, isAdd, folders, folderOf, onCycleVisibility, onAssignFolder, icon, labelKey, customName, onRename, nested }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const Icon = icon ?? TAB_ICONS[id]
  const style = { transform: CSS.Transform.toString(transform), transition }
  const folderItems = [{ value: NO_FOLDER, label: '—' }, ...folders.map(f => ({ value: f.id, label: f.label }))]
  return (
    <li ref={setNodeRef} style={style}
      className={cn('flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 bg-card',
        nested && 'ml-6 border-l-2 border-l-primary/40',
        visibility !== 'both' && 'opacity-60', visibility === 'none' && 'opacity-40', isDragging && 'shadow-lg z-10')}>
      <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes} {...listeners} title={t.navDrag}>
        <GripVertical className="h-4 w-4" />
      </button>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {isAdd ? (
        <span className="flex-1 text-sm truncate">{t.navAddLabel}</span>
      ) : (
        <Input
          value={customName !== undefined ? customName : t[labelKey ?? id]}
          placeholder={t[labelKey ?? id]}
          onChange={e => onRename?.(id, e.target.value)}
          className="h-7 flex-1 text-sm"
        />
      )}
      {folders.length > 0 && (
        <Select value={folderOf ?? NO_FOLDER} onValueChange={v => onAssignFolder(id, v === NO_FOLDER ? null : v)} items={folderItems}>
          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {folderItems.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {!isAdd && (() => {
        const VisIcon = VIS_ICONS[visibility] ?? Eye
        return (
          <button title={t[VIS_LABEL_KEYS[visibility]] ?? t.navHide} onClick={() => onCycleVisibility(id)}
            className={cn('rounded p-1.5 transition-colors',
              visibility === 'both' ? 'text-muted-foreground hover:text-foreground'
                : visibility === 'none' ? 'text-muted-foreground/50 hover:text-muted-foreground'
                : 'text-muted-foreground hover:text-foreground')}>
            <VisIcon className="h-4 w-4" />
          </button>
        )
      })()}
    </li>
  )
}

function FolderRow({ folder, t, visibility, onRename, onSetIcon, onDelete, onCycleVisibility }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const iconItems = Object.keys(FOLDER_ICONS).map(k => ({ value: k, label: k }))
  const FIcon = FOLDER_ICONS[folder.icon] ?? FOLDER_ICONS.folder
  const VisIcon = VIS_ICONS[visibility] ?? Eye
  return (
    <li ref={setNodeRef} style={style}
      className={cn('flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 bg-card',
        visibility !== 'both' && 'opacity-60', visibility === 'none' && 'opacity-40', isDragging && 'shadow-lg z-10')}>
      <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes} {...listeners} title={t.navDrag}>
        <GripVertical className="h-4 w-4" />
      </button>
      <FIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input value={folder.label} className="h-7 flex-1 text-sm" onChange={e => onRename(folder.id, e.target.value)} />
      <Select value={folder.icon ?? 'folder'} onValueChange={v => onSetIcon(folder.id, v)} items={iconItems}>
        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {iconItems.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <button title={t[VIS_LABEL_KEYS[visibility]] ?? t.navHide} onClick={() => onCycleVisibility(folder.id)}
        className={cn('rounded p-1.5 transition-colors',
          visibility === 'none' ? 'text-muted-foreground/50 hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground')}>
        <VisIcon className="h-4 w-4" />
      </button>
      <button onClick={() => onDelete(folder.id)} className="text-muted-foreground hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}

function buildOrder(navbar, showAddButton, enabledAppIds, optionalTabIds, folders) {
  const folderIds = new Set(folders.map(f => f.id))
  let order = navbar.order?.length ? [...navbar.order] : [...DEFAULT_ORDER]
  order = order.filter(id => folderIds.has(id) || !optionalTabIds.has(id) || enabledAppIds.has(id))
  const insert = id => {
    if (order.includes(id)) return
    const i = order.indexOf('settings')
    if (i === -1) order.push(id)
    else order.splice(i, 0, id)
  }
  if (showAddButton) insert(ADD_ID)
  else if (order.includes(ADD_ID)) order.splice(order.indexOf(ADD_ID), 1)
  for (const id of enabledAppIds) insert(id)
  for (const f of folders) insert(f.id)
  return order
}

export function NavbarSettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const navbar = useStore(s => s.settings?.navbar) ?? { order: DEFAULT_ORDER, visibility: {}, folders: [], showAddButton: false, labelMode: 'both', mobilePosition: 'bottom', addAction: 'task', addButtonLabel: '', customNames: {} }
  const state = useStore(s => s)
  const updateSettings = useStore(s => s.updateSettings)

  const appTabs = getAppTabs()
  const optionalTabIds = new Set(appTabs.map(pt => pt.id))
  const enabledAppIds = new Set(appTabs.filter(pt => getAppById(pt.id)?.isEnabled(state)).map(pt => pt.id))
  const appIcons = Object.fromEntries(appTabs.map(pt => [pt.id, getAppById(pt.id)?.icon]))
  const appLabelKeys = Object.fromEntries(appTabs.map(pt => [pt.id, getAppById(pt.id)?.labelKey ?? pt.id]))

  const showAddButton = Boolean(navbar.showAddButton)
  const labelMode = navbar.labelMode ?? 'both'
  const folders = Array.isArray(navbar.folders) ? navbar.folders : []
  const folderById = new Map(folders.map(f => [f.id, f]))
  const order = buildOrder(navbar, showAddButton, enabledAppIds, optionalTabIds, folders)
  const visibility = navbar.visibility ?? {}
  const visibilityOf = id => visibility[id] ?? 'both'
  const folderOf = id => folders.find(f => (f.children ?? []).includes(id))?.id ?? null

  // Visual order: each folder row is immediately followed by its children, so a
  // tab assigned to a folder appears inline beneath it instead of staying at its
  // original top-level position.
  const childOf = new Map()
  for (const f of folders) for (const c of f.children ?? []) childOf.set(c, f.id)
  const displayOrder = []
  for (const id of order) {
    if (childOf.has(id) && folderById.has(childOf.get(id))) continue
    displayOrder.push(id)
    if (folderById.has(id)) {
      const children = (folderById.get(id).children ?? [])
        .filter(c => order.includes(c))
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      for (const c of children) displayOrder.push(c)
    }
  }
  for (const id of order) if (!displayOrder.includes(id)) displayOrder.push(id)

  const save = patch => updateSettings({ navbar: { ...navbar, order, visibility, labelMode, mobilePosition: navbar.mobilePosition ?? 'bottom', addAction: navbar.addAction ?? 'task', folders, ...patch } })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // Dragging happens in displayOrder space (folder children sit under their
  // folder), so reorder there and flatten the result back into a flat order.
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = displayOrder.indexOf(active.id)
    const to = displayOrder.indexOf(over.id)
    if (from === -1 || to === -1) return
    const newDisplay = arrayMove(displayOrder, from, to)

    // A tab dropped directly beneath a folder row joins that folder; one dropped
    // in a top-level slot leaves whatever folder it was in.
    const newChildren = new Map(folders.map(f => [f.id, []]))
    let currentFolder = null
    for (const id of newDisplay) {
      if (folderById.has(id)) { currentFolder = id; continue }
      const prevFolder = childOf.get(id)
      // Only tabs that were already nested, or were dragged into a folder's run,
      // stay nested; a folder's run ends at the next top-level (unnested) tab.
      if (currentFolder && (prevFolder === currentFolder || active.id === id)) {
        newChildren.get(currentFolder).push(id)
      } else {
        currentFolder = null
      }
    }

    const newOrder = newDisplay.filter(id => order.includes(id))
    save({
      order: newOrder,
      folders: folders.map(f => ({ ...f, children: newChildren.get(f.id) ?? [] })),
    })
  }

  const cycleVisibility = id => {
    const next = VIS_CYCLE[visibilityOf(id)] ?? 'none'
    const map = { ...visibility }
    if (next === 'both') delete map[id]
    else map[id] = next
    save({ visibility: map })
  }

  const addFolder = () => save({ folders: [...folders, { id: 'folder_' + nanoid(), label: t.navMore, icon: 'more', children: [] }] })
  const renameFolder = (fid, label) => save({ folders: folders.map(f => f.id === fid ? { ...f, label } : f) })
  const setFolderIcon = (fid, icon) => save({ folders: folders.map(f => f.id === fid ? { ...f, icon } : f) })
  const deleteFolder = fid => save({
    folders: folders.filter(f => f.id !== fid),
    order: order.filter(id => id !== fid),
    visibility: (() => { const map = { ...visibility }; delete map[fid]; return map })(),
  })
  // Assigning a tab to a folder also moves it in `order` to sit right after that
  // folder, so it stays inline beneath it instead of jumping back to its old slot.
  const assignFolder = (tabId, fid) => {
    const newOrder = order.filter(id => id !== tabId)
    if (fid) {
      const folderIdx = newOrder.indexOf(fid)
      const existing = (folderById.get(fid)?.children ?? []).filter(c => c !== tabId)
      const lastChildIdx = existing.reduce((max, c) => Math.max(max, newOrder.indexOf(c)), folderIdx)
      newOrder.splice(lastChildIdx + 1, 0, tabId)
    } else {
      newOrder.push(tabId)
    }
    save({
      order: newOrder,
      folders: folders.map(f => ({
        ...f,
        children: (f.id === fid
          ? [...new Set([...(f.children ?? []), tabId])]
          : (f.children ?? []).filter(c => c !== tabId)
        ).sort((a, b) => newOrder.indexOf(a) - newOrder.indexOf(b)),
      })),
    })
  }
  const renameTab = (id, name) => save({ customNames: { ...(navbar.customNames ?? {}), [id]: name } })

  const labelOptions = [
    { value: 'both', label: t.navLabelBoth },
    { value: 'icons', label: t.navLabelIcons },
    { value: 'names', label: t.navLabelNames },
  ]
  const mobilePosition = navbar.mobilePosition ?? 'bottom'
  const positionOptions = [
    { value: 'bottom', label: t.navPosBottom },
    { value: 'side', label: t.navPosSide },
  ]
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t.navLabelMode}</Label>
        <Select value={labelMode} onValueChange={v => save({ labelMode: v })} items={labelOptions}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {labelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t.navMobilePosition}</Label>
        <Select value={mobilePosition} onValueChange={v => save({ mobilePosition: v })} items={positionOptions}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {positionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>{t.navFolders}</Label>
        <button onClick={addFolder} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <FolderPlus className="h-3.5 w-3.5" /> {t.navNewFolder}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={displayOrder} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {displayOrder.map(id => (
              folderById.has(id)
                ? <FolderRow key={id} folder={folderById.get(id)} t={t}
                    visibility={visibilityOf(id)}
                    onRename={renameFolder} onSetIcon={setFolderIcon} onDelete={deleteFolder}
                    onCycleVisibility={cycleVisibility} />
                : <TabRow key={id} id={id} t={t} isAdd={id === ADD_ID}
                    visibility={visibilityOf(id)}
                    icon={appIcons[id]} labelKey={appLabelKeys[id]}
                    customName={navbar.customNames?.[id]} onRename={renameTab}
                    folders={folders} folderOf={folderOf(id)} onAssignFolder={assignFolder}
                    nested={Boolean(folderOf(id))}
                    onCycleVisibility={cycleVisibility} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
