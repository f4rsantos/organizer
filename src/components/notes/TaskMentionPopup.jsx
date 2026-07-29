import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export function TaskMentionPopup({ tasks, activeIndex, onSelect, onHover, emptyLabel }) {
  const listRef = useRef(null)

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div className="absolute z-20 mt-1 w-full max-w-sm rounded-lg border border-border bg-popover shadow-md overflow-hidden">
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {tasks.length === 0
          ? <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
          : tasks.map((task, i) => (
            <div key={task.id} data-active={i === activeIndex}
              className={cn('px-3 py-1.5 text-sm cursor-pointer truncate', i === activeIndex && 'bg-secondary')}
              onMouseEnter={() => onHover?.(i)}
              onMouseDown={e => { e.preventDefault(); onSelect(task) }}>
              {task.title}
            </div>
          ))}
      </div>
    </div>
  )
}
