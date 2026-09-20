import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

function NotificationRow({ title, body }) {
  return (
    <div className="rounded-lg px-2 py-1.5">
      <p className="text-sm font-medium truncate">{title}</p>
      {body && <p className="text-xs text-muted-foreground truncate">{body}</p>}
    </div>
  )
}

export function NotificationBell({ unread, upcoming, unreadLabel, upcomingLabel, emptyLabel, clearLabel, hasUnread, onClearUnread }) {
  return (
    <Popover>
      <PopoverTrigger render={
        <button
          type="button"
          title={unreadLabel}
          className={cn(
            'flex items-center justify-center rounded-lg p-2 transition-colors',
            hasUnread ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground',
          )}
        />
      }>
        <Bell className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-h-80 overflow-y-auto">
        {unread.length === 0 && upcoming.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
        )}
        {unread.length > 0 && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2 px-2 pb-1">
              <p className="text-xs font-medium text-muted-foreground">{unreadLabel}</p>
              <button
                type="button"
                onClick={onClearUnread}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {clearLabel}
              </button>
            </div>
            {unread.map(entry => (
              <NotificationRow key={entry.id} title={entry.title} body={entry.body} />
            ))}
          </div>
        )}
        {unread.length > 0 && upcoming.length > 0 && <Separator className="my-2" />}
        {upcoming.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{upcomingLabel}</p>
            {upcoming.map(entry => (
              <NotificationRow key={entry.id} title={entry.title} body={entry.body} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
