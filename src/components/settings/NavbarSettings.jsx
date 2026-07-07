import { nanoid } from '@/lib/ids'
import { GripVertical, Eye, EyeOff, FolderPlus, X } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { TAB_ICONS, FOLDER_ICONS, DEFAULT_ORDER, ADD_ID } from '@/components/layout/useNavTabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const NO_FOLDER = '__none__'

function TabRow({ id, t, isHidden, isAdd, folders, folderOf, onToggleHidden, onAssignFolder }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const Icon = TAB_ICONS[id]
  const style = { transform: CSS.Transform.toString(transform), transition }
  const folderItems = [{ value: NO_FOLDER, label: '—' }, ...folders.map(f => ({ value: f.id, label: f.label }))]
  return (
    <li ref={setNodeRef} style={style}
      className={cn('flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 bg-card',
        isHidden && 'opacity-50', isDragging && 'shadow-lg z-10')}>
      <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes} {...listeners} title={t.navDrag}>
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm truncate">{isAdd ? t.navAddLabel : t[id]}</span>
      {folders.length > 0 && (
        <Select value={folderOf ?? NO_FOLDER} onValueChange={v => onAssignFolder(id, v === NO_FOLDER ? null : v)} items={folderItems}>
          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {folderItems.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {!isAdd && (
        <button title={t.navHide} onClick={() => onToggleHidden(id)}
          className="rounded p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </li>
  )
}

function FolderRow({ folder, onRename, onSetIcon, onDelete }) {
  const iconItems = Object.keys(FOLDER_ICONS).map(k => ({ value: k, label: k }))
  const FIcon = FOLDER_ICONS[folder.icon] ?? FOLDER_ICONS.folder
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
      <FIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input value={folder.label} className="h-7 flex-1 text-sm" onChange={e => onRename(folder.id, e.target.value)} />
      <Select value={folder.icon ?? 'folder'} onValueChange={v => onSetIcon(folder.id, v)} items={iconItems}>
        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {iconItems.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <button onClick={() => onDelete(folder.id)} className="text-muted-foreground hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function buildOrder(navbar, showAddButton, notesEnabled) {
  let order = navbar.order?.length ? [...navbar.order] : [...DEFAULT_ORDER]
  order = order.filter(id => id !== 'notes')
  const insert = id => {
    if (order.includes(id)) return
    const i = order.indexOf('settings')
    if (i === -1) order.push(id)
    else order.splice(i, 0, id)
  }
  if (showAddButton) insert(ADD_ID)
  else if (order.includes(ADD_ID)) order.splice(order.indexOf(ADD_ID), 1)
  if (notesEnabled) insert('notes')
  return order
}

export function NavbarSettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const navbar = useStore(s => s.settings?.navbar) ?? { order: DEFAULT_ORDER, hidden: [], folders: [], showAddButton: false, labelMode: 'both' }
  const notesEnabled = useStore(s => s.settings?.apps?.notes === true)
  const updateSettings = useStore(s => s.updateSettings)

  const showAddButton = Boolean(navbar.showAddButton)
  const labelMode = navbar.labelMode ?? 'both'
  const order = buildOrder(navbar, showAddButton, notesEnabled)
  const hidden = new Set(navbar.hidden ?? [])
  const folders = Array.isArray(navbar.folders) ? navbar.folders : []
  const folderOf = id => folders.find(f => (f.children ?? []).includes(id))?.id ?? null

  const save = patch => updateSettings({ navbar: { ...navbar, order, hidden: [...hidden], labelMode, mobilePosition: navbar.mobilePosition ?? 'bottom', addAction: navbar.addAction ?? 'task', folders, ...patch } })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    save({ order: arrayMove(order, order.indexOf(active.id), order.indexOf(over.id)) })
  }

  const toggleHidden = id => {
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    save({ hidden: [...next] })
  }

  const addFolder = () => save({ folders: [...folders, { id: 'folder_' + nanoid(), label: t.navMore, icon: 'more', children: [] }] })
  const renameFolder = (fid, label) => save({ folders: folders.map(f => f.id === fid ? { ...f, label } : f) })
  const setFolderIcon = (fid, icon) => save({ folders: folders.map(f => f.id === fid ? { ...f, icon } : f) })
  const deleteFolder = fid => save({ folders: folders.filter(f => f.id !== fid) })
  const assignFolder = (tabId, fid) => save({
    folders: folders.map(f => ({
      ...f,
      children: f.id === fid
        ? [...new Set([...(f.children ?? []), tabId])]
        : (f.children ?? []).filter(c => c !== tabId),
    })),
  })

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
  const addActionOptions = [
    { value: 'task', label: t.addTask },
    { value: 'kanban', label: t.addCard },
    { value: 'event', label: t.addEvent },
    { value: 'note', label: t.notesNew },
    { value: 'picker', label: t.navAddPicker },
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {order.map(id => (
              <TabRow key={id} id={id} t={t} isAdd={id === ADD_ID}
                isHidden={hidden.has(id)}
                folders={folders} folderOf={folderOf(id)} onAssignFolder={assignFolder}
                onToggleHidden={toggleHidden} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>{t.navFolders}</Label>
          <button onClick={addFolder} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <FolderPlus className="h-3.5 w-3.5" /> {t.navNewFolder}
          </button>
        </div>
        {folders.map(f => (
          <FolderRow key={f.id} folder={f} onRename={renameFolder} onSetIcon={setFolderIcon} onDelete={deleteFolder} />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
        <span>{t.navAddButton}</span>
        <Switch checked={showAddButton} onCheckedChange={v => save({ showAddButton: v })} />
      </div>

      {showAddButton && (
        <div className="space-y-1.5">
          <Label>{t.navAddAction}</Label>
          <Select value={navbar.addAction ?? 'task'} onValueChange={v => save({ addAction: v })} items={addActionOptions}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {addActionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
