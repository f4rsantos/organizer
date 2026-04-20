import { useState } from 'react'
import { Users, Link2, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { loadFirebaseConfig, markCollabRulesEnabled } from '@/lib/firebase'
import { deleteTeam, leaveTeam } from '@/lib/collab/firebase'

const RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`

function CollabGuideModal({ open, onOpenChange, onEnable }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.collabGuideTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{t.collabGuideIntro}</p>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-medium mb-1">{t.collabGuideImportantTitle}</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>{t.collabGuideImportant1}</li>
              <li>{t.collabGuideImportant2}</li>
              <li>{t.collabGuideImportant3}</li>
            </ul>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>{t.collabGuideStep1}</li>
            <li>{t.collabGuideStep2}</li>
            <li>{t.collabGuideStep3}</li>
            <li>{t.collabGuideStep4}</li>
          </ol>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-medium mb-2">{t.collabGuideRulesLabel}</p>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{RULES_SNIPPET}</pre>
          </div>
          <Button className="w-full" onClick={onEnable}>{t.collabEnableNow}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CollabConnectButton({ firebaseConnected }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const updateSettings = useStore(s => s.updateSettings)
  const removeCollabMembership = useStore(s => s.removeCollabMembership)
  const clearTaskSharedRefByTeam = useStore(s => s.clearTaskSharedRefByTeam)
  const clearCollabRuntimeTeam = useStore(s => s.clearCollabRuntimeTeam)
  const [openGuide, setOpenGuide] = useState(false)

  const disabled = !firebaseConnected && !collabEnabled

  const handleDisconnect = async () => {
    const state = useStore.getState()
    const userId = state.collab?.userId
    const memberships = state.collab?.memberships ?? []
    const runtimeTeams = state.collabRuntime?.teams ?? {}

    for (const membership of memberships) {
      const runtime = runtimeTeams[membership.teamId]
      const config = { apiKey: membership.apiKey, projectId: membership.projectId }
      if (userId && runtime?.hostUserId === userId) {
        try {
          await deleteTeam({ config, teamId: membership.teamId })
        } catch {
        }
      } else if (userId) {
        try {
          await leaveTeam({ config, teamId: membership.teamId, userId })
        } catch {
        }
      }

      clearTaskSharedRefByTeam(membership.teamId)
      clearCollabRuntimeTeam(membership.teamId)
      removeCollabMembership(membership.teamId)
    }

    updateSettings({ collabEnabled: false })
  }

  const handleClick = async () => {
    if (collabEnabled) {
      await handleDisconnect()
      return
    }
    setOpenGuide(true)
  }

  const handleEnable = () => {
    markCollabRulesEnabled()
    updateSettings({ collabEnabled: true })
    setOpenGuide(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="col-span-2 gap-2 w-full"
        disabled={disabled}
        onClick={handleClick}
      >
        {collabEnabled
          ? <Unplug className="h-4 w-4" />
          : <Users className="h-4 w-4" />
        }
        {collabEnabled ? t.collabDisconnect : t.collabConnect}
      </Button>

      {!firebaseConnected && !collabEnabled && (
        <p className="col-span-2 text-xs text-muted-foreground">{t.collabRequiresFirebase}</p>
      )}

      <CollabGuideModal open={openGuide} onOpenChange={setOpenGuide} onEnable={handleEnable} />
    </>
  )
}
