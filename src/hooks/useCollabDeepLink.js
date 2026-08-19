import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { parseInviteLink } from '@/lib/collab/link'
import { joinWithInvite } from '@/lib/collab/firebase'
import { getOrCreateCollabUserId } from '@/lib/collab/identity'
import { markCollabRulesEnabled } from '@/lib/firebase'

export function useCollabDeepLink() {
  const hydrated = useStore(s => s.hydrated === true)
  const ran = useRef(false)

  useEffect(() => {
    if (!hydrated || ran.current) return
    ran.current = true

    const parsed = parseInviteLink(window.location.href)
    if (!parsed) return

    const state = useStore.getState()
    const existing = (state.collab?.memberships ?? []).find(m => m.teamId === parsed.teamId)
    if (existing) {
      cleanUrl()
      return
    }

    const userId = state.collab?.userId ?? getOrCreateCollabUserId()

    if (!state.collab?.userId) {
      useStore.getState().setCollabUserId(userId)
    }

    if (!state.settings?.collabEnabled) {
      markCollabRulesEnabled()
      useStore.getState().updateSettings({ collabEnabled: true, apps: { ...state.settings?.apps, collab: true } })
    }

    joinWithInvite({
      config: { apiKey: parsed.apiKey, projectId: parsed.projectId },
      teamId: parsed.teamId,
      token: parsed.token,
      personId: useStore.getState().collab?.userId ?? null,
    })
      .then(({ teamName }) => {
        useStore.getState().addCollabMembership({
          teamId: parsed.teamId,
          apiKey: parsed.apiKey,
          projectId: parsed.projectId,
          teamKey: parsed.teamKey,
          ...(teamName ? { teamName } : {}),
        })
      })
      .catch(() => {})
      .finally(cleanUrl)
  }, [hydrated])
}

function cleanUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('oc_p')
  url.searchParams.delete('oc_k')
  url.searchParams.delete('oc_t')
  url.searchParams.delete('oc_s')
  url.hash = ''
  window.history.replaceState(null, '', url.toString())
}
