import { useState, useEffect, useCallback } from 'react'
import { Plus, Bookmark, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadChatSessions, toggleChatSaved, deleteChatSession } from '../chatHistoryDb'

function formatTimeAgo(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  activeChatId,
  workingChatId,
  onSelectChat,
  onNewChat,
  t,
}) {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(false)

  const refreshChats = useCallback(async () => {
    setLoading(true)
    try {
      const list = await loadChatSessions()
      setChats(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      refreshChats()
    }
  }, [isOpen, refreshChats])

  const handleToggleSave = async (e, id) => {
    e.stopPropagation()
    const updated = await toggleChatSaved(id)
    if (updated) {
      setChats(prev => prev.map(c => (c.id === id ? updated : c)))
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await deleteChatSession(id)
    setChats(prev => prev.filter(c => c.id !== id))
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-y-0 left-0 z-40 w-72 md:w-80 bg-background/95 backdrop-blur-md border-r border-border flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">{t.aiHistory}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        <button
          type="button"
          onClick={() => {
            onNewChat()
            onClose()
          }}
          className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-foreground/90 hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t.aiNewConversation}</span>
        </button>

        {chats.length === 0 && !loading && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t.aiHistoryEmpty}
          </div>
        )}

        {chats.map(chat => {
          const isActive = chat.id === activeChatId
          const isWorking = Boolean(workingChatId && chat.id === workingChatId)
          return (
            <div
              key={chat.id}
              onClick={() => {
                onSelectChat(chat)
                onClose()
              }}
              className={cn(
                'group flex items-center justify-between gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors',
                isActive
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-foreground/80 hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0 ml-1',
                    isWorking ? 'bg-blue-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-500',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{chat.title || 'Chat'}</p>
                  <span className="text-[10px] text-muted-foreground">{formatTimeAgo(chat.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={e => handleToggleSave(e, chat.id)}
                  title={chat.saved ? t.aiHistorySaved : t.aiHistorySave}
                  aria-label={chat.saved ? t.aiHistorySaved : t.aiHistorySave}
                  className={cn(
                    'p-1 rounded-md transition-colors',
                    chat.saved
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  <Bookmark className={cn('h-3.5 w-3.5', chat.saved && 'fill-current')} />
                </button>

                <button
                  type="button"
                  onClick={e => handleDelete(e, chat.id)}
                  title={t.aiHistoryDelete}
                  aria-label={t.aiHistoryDelete}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
