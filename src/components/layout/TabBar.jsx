import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useNavTabs } from './useNavTabs'
import { NavAddButton } from './NavAddButton'

function FolderMenu({ folder, activeTab, onTabChange, orientation, labelMode }) {
  const [open, setOpen] = useState(false)
  const Icon = folder.icon
  const anchor = orientation === 'sidebar' ? 'left-0 bottom-full mb-2'
    : orientation === 'collapsed' ? 'left-full bottom-0 ml-2'
    : 'right-2 bottom-full mb-2'
  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'

  const trigger =
    orientation === 'collapsed' ? (
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center rounded-lg px-3 py-2.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
        <Icon className="h-4 w-4" />
      </button>
    ) : orientation === 'sidebar' ? (
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full text-left">
        {showIcon && <Icon className="h-4 w-4 shrink-0" />} {showLabel && <span className="truncate">{folder.label}</span>}
      </button>
    ) : (
      <button onClick={() => setOpen(v => !v)}
        className="flex w-full min-w-0 flex-col items-center gap-1 py-3 text-xs text-muted-foreground hover:text-foreground">
        {showIcon && <Icon className="h-5 w-5" />}
        {showLabel && <span className="font-medium truncate max-w-full">{folder.label}</span>}
      </button>
    )

  return (
    <div className={cn('relative', orientation === 'bottom' && 'min-w-0 flex-1', orientation === 'collapsed' && 'w-full flex justify-center')}>
      {trigger}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn('absolute z-50 min-w-40 rounded-xl border border-border bg-background p-1 shadow-lg', anchor)}>
            {folder.items.map(({ id, label, icon: ItemIcon, isAdd }) => (
              isAdd
                ? <NavAddButton key={id} variant="menu" />
                : <button key={id} onClick={() => { onTabChange(id); setOpen(false) }}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                      activeTab === id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary')}>
                    <ItemIcon className="h-4 w-4 shrink-0" /> {label}
                  </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function TabBar({ activeTab, onTabChange }) {
  const { primary, folders, labelMode } = useNavTabs()
  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center md:hidden">
      <div className="flex w-full border-t border-border bg-background/90 backdrop-blur-sm">
        {primary.map(({ id, label, icon: Icon, isAdd }) => (
          isAdd
            ? <NavAddButton key={id} variant="bottom" labelMode={labelMode} />
            : <button key={id} onClick={() => onTabChange(id)}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors duration-150',
                  activeTab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}>
                {showIcon && <Icon className={cn('h-5 w-5 transition-transform duration-150', activeTab === id && 'scale-110')} />}
                {showLabel && <span className="font-medium truncate max-w-full">{label}</span>}
              </button>
        ))}
        {folders.map(f => (
          <FolderMenu key={f.id} folder={f} activeTab={activeTab} onTabChange={onTabChange} orientation="bottom" labelMode={labelMode} />
        ))}
      </div>
    </nav>
  )
}

export function SideBar({ activeTab, onTabChange, open, onToggle, mobileSide = false }) {
  const { primary, folders, labelMode } = useNavTabs()
  const vis = mobileSide ? 'flex' : 'hidden md:flex'

  if (!open) {
    return (
      <nav className={cn(vis, 'flex-col items-center gap-1 w-10 shrink-0 pt-8')}>
        {primary.map(({ id, icon: Icon, isAdd }) => (
          isAdd
            ? <NavAddButton key={id} variant="sidebar-collapsed" />
            : <button key={id} onClick={() => onTabChange(id)}
                className={cn('flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-150',
                  activeTab === id ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
                )}>
                <Icon className="h-4 w-4" />
              </button>
        ))}
        {folders.map(f => (
          <FolderMenu key={f.id} folder={f} activeTab={activeTab} onTabChange={onTabChange} orientation="collapsed" labelMode={labelMode} />
        ))}
        <div className="flex-1 cursor-pointer w-full" onClick={onToggle} />
      </nav>
    )
  }

  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'
  return (
    <nav className={cn(vis, 'flex-col gap-1 w-56 shrink-0 pt-8 px-4')}>
      {primary.map(({ id, label, icon: Icon, isAdd }) => (
        isAdd
          ? <NavAddButton key={id} variant="sidebar" labelMode={labelMode} />
          : <button key={id} onClick={() => onTabChange(id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-left',
                activeTab === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}>
              {showIcon && <Icon className={cn('h-4 w-4 shrink-0', activeTab === id && 'text-primary')} />}
              {showLabel && label}
            </button>
      ))}
      {folders.map(f => (
        <FolderMenu key={f.id} folder={f} activeTab={activeTab} onTabChange={onTabChange} orientation="sidebar" labelMode={labelMode} />
      ))}
      <div className="flex-1 cursor-pointer" onClick={onToggle} />
    </nav>
  )
}
