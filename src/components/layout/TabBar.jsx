import { useState, useRef, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { selectActiveAgentRunPill } from '@/store/selectors'
import { useNavTabs } from './useNavTabs'
import { NavAddButton } from './NavAddButton'

function AgentRunPill({ orientation, activeTab }) {
  const pill = useStore(useShallow(selectActiveAgentRunPill))
  const setActiveTab = useStore(s => s.setActiveTab)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  if (!pill) return null
  if (activeTab === 'aiAssistant') return null
  if (pill.phase === 'working') return null

  const label = pill.phase === 'failed' ? t.aiPillFailed
    : pill.phase === 'interrupted' ? t.aiPillInterrupted
    : t.aiPillReplyReady

  const tone = pill.phase === 'failed' || pill.phase === 'interrupted' ? 'text-destructive' : 'text-primary'

  return (
    <button
      onClick={() => setActiveTab?.('aiAssistant')}
      title={label}
      className={cn(
        'text-xs font-medium transition-colors hover:underline',
        tone,
        orientation === 'collapsed' ? 'block' : 'block px-3 py-1',
      )}>
      {label}
    </button>
  )
}

function FolderMenu({ folder, activeTab, onTabChange, orientation, labelMode }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const Icon = folder.icon
  const holdsActive = folder.items.some(i => i.id === activeTab)
  const anchor = orientation === 'sidebar' ? 'left-0 bottom-full mb-2'
    : orientation === 'collapsed' ? 'left-full bottom-0 ml-2'
    : 'right-2 bottom-full mb-2'
  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'

  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const trigger =
    orientation === 'collapsed' ? (
      <button onClick={() => setOpen(v => !v)}
        title={folder.label}
        className={cn('flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors',
          holdsActive ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </button>
    ) : orientation === 'sidebar' ? (
      <button onClick={() => setOpen(v => !v)}
        className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left',
          holdsActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
        {showIcon && <Icon className={cn('h-4 w-4 shrink-0', holdsActive && 'text-primary')} />} {showLabel && <span className="truncate">{folder.label}</span>}
      </button>
    ) : (
      <button onClick={() => setOpen(v => !v)}
        className={cn('flex w-full min-w-0 flex-col items-center transition-colors',
          holdsActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          showLabel ? 'gap-1 py-3 text-xs' : 'py-2')}>
        {showIcon && <Icon className={cn('h-5 w-5 transition-transform duration-150', holdsActive && 'scale-110')} />}
        {showLabel && <span className="font-medium truncate max-w-full">{folder.label}</span>}
      </button>
    )

  return (
    <div ref={menuRef} className={cn('relative', orientation === 'bottom' && 'min-w-0 flex-1', orientation === 'collapsed' && 'w-full flex justify-center')}>
      {trigger}
      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setOpen(false)} onPointerDown={() => setOpen(false)} />
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
  const { items, labelMode } = useNavTabs()
  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center md:hidden">
      <div className="flex w-full justify-center pb-1 px-safe">
        <AgentRunPill orientation="bottom" activeTab={activeTab} />
      </div>
      <div className="flex w-full border-t border-border bg-background/90 backdrop-blur-sm pb-safe px-safe">
        {items.map(item => (
          item.isFolder
            ? <FolderMenu key={item.id} folder={item} activeTab={activeTab} onTabChange={onTabChange} orientation="bottom" labelMode={labelMode} />
            : item.isAdd
              ? <NavAddButton key={item.id} variant="bottom" labelMode={labelMode} />
              : <button key={item.id} onClick={() => onTabChange(item.id)}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center transition-colors duration-150',
                    showLabel ? 'gap-1 py-3 text-xs' : 'py-2',
                    activeTab === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}>
                  {showIcon && <item.icon className={cn('h-5 w-5 transition-transform duration-150', activeTab === item.id && 'scale-110')} />}
                  {showLabel && <span className="font-medium truncate max-w-full">{item.label}</span>}
                </button>
        ))}
      </div>
    </nav>
  )
}

export function SideBar({ activeTab, onTabChange, open, onToggle, mobileSide = false }) {
  const { items, labelMode } = useNavTabs()
  const vis = mobileSide ? 'flex pt-safe pb-safe pl-safe' : 'hidden md:flex'
  const isIconsOnly = labelMode === 'icons'

  if (!open || isIconsOnly) {
    return (
      <nav className={cn(vis, 'flex-col items-center gap-1 w-10 shrink-0 pt-8')}>
        {items.map(item => (
          item.isFolder
            ? <FolderMenu key={item.id} folder={item} activeTab={activeTab} onTabChange={onTabChange} orientation="collapsed" labelMode={labelMode} />
            : item.isAdd
              ? <NavAddButton key={item.id} variant="sidebar-collapsed" />
              : <button key={item.id} onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={cn('flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors duration-150',
                    activeTab === item.id ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
                  )}>
                  <item.icon className="h-4 w-4" />
                </button>
        ))}
        <div className="flex-1 cursor-pointer w-full" onClick={onToggle} />
        <AgentRunPill orientation="collapsed" activeTab={activeTab} />
      </nav>
    )
  }

  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'
  return (
    <nav className={cn(vis, 'flex-col gap-1 w-56 shrink-0 pt-8 px-4')}>
      {items.map(item => (
        item.isFolder
          ? <FolderMenu key={item.id} folder={item} activeTab={activeTab} onTabChange={onTabChange} orientation="sidebar" labelMode={labelMode} />
          : item.isAdd
            ? <NavAddButton key={item.id} variant="sidebar" labelMode={labelMode} />
            : <button key={item.id} onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 text-left',
                  activeTab === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}>
                {showIcon && <item.icon className={cn('h-4 w-4 shrink-0', activeTab === item.id && 'text-primary')} />}
                {showLabel && item.label}
              </button>
      ))}
      <div className="flex-1 cursor-pointer" onClick={onToggle} />
      <div className="px-1 pb-2">
        <AgentRunPill orientation="sidebar" activeTab={activeTab} />
      </div>
    </nav>
  )
}
