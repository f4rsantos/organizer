import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveChatSession,
  getChatSession,
  loadChatSessions,
  toggleChatSaved,
  deleteChatSession,
  clearMemoryFallback,
} from '../../../src/apps/aiAssistant/chatHistoryDb'

describe('chatHistoryDb', () => {
  beforeEach(() => {
    clearMemoryFallback()
  })

  it('saves and retrieves a chat session', async () => {
    const chat = { id: 'c1', title: 'Plan trip', messages: [{ role: 'user', content: 'hello' }], updatedAt: Date.now() }
    await saveChatSession(chat)
    const fetched = await getChatSession('c1')
    expect(fetched).not.toBeNull()
    expect(fetched.title).toBe('Plan trip')
    expect(fetched.saved).toBe(false)
  })

  it('toggles chat saved status for permanent retention', async () => {
    const chat = { id: 'c2', title: 'Keep this', messages: [], updatedAt: Date.now() }
    await saveChatSession(chat)
    const toggled = await toggleChatSaved('c2')
    expect(toggled.saved).toBe(true)
    const after = await getChatSession('c2')
    expect(after.saved).toBe(true)
    const toggledBack = await toggleChatSaved('c2')
    expect(toggledBack.saved).toBe(false)
  })

  it('prunes unsaved chats older than 24 hours while keeping saved chats', async () => {
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000)
    const recentTimestamp = Date.now() - (2 * 60 * 60 * 1000)

    await saveChatSession({ id: 'old-unsaved', title: 'Old Unsaved', messages: [], updatedAt: oldTimestamp, saved: false })
    await saveChatSession({ id: 'old-saved', title: 'Old Saved', messages: [], updatedAt: oldTimestamp, saved: true })
    await saveChatSession({ id: 'recent', title: 'Recent', messages: [], updatedAt: recentTimestamp, saved: false })

    const list = await loadChatSessions()
    const ids = list.map(c => c.id)
    expect(ids).toContain('recent')
    expect(ids).toContain('old-saved')
    expect(ids).not.toContain('old-unsaved')
  })

  it('deletes a chat session', async () => {
    await saveChatSession({ id: 'c3', title: 'To Delete', messages: [] })
    await deleteChatSession('c3')
    const fetched = await getChatSession('c3')
    expect(fetched).toBeNull()
  })
})
