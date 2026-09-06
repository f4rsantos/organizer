import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { loadFirebaseConfig, hasSeenCollabGuide, markCollabGuideSeen } from '@/lib/firebase'
import { CollabConnectButton, CollabGuideModal } from '../CollabConnectPanel'
import { CollabPanel } from '../CollabPanel'

export function CollabAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const firebaseConnected = !!loadFirebaseConfig()
  const [guideDismissed, setGuideDismissed] = useState(false)

  // Someone who enabled collab without a Firebase project never saw the setup
  // guide. Show it once when they open the tab after connecting one.
  const showGuide = open && firebaseConnected && collabEnabled
    && !guideDismissed && !hasSeenCollabGuide()

  const dismissGuide = () => {
    markCollabGuideSeen()
    setGuideDismissed(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t.collabApp}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-[320px] shrink-0 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <CollabConnectButton firebaseConnected={firebaseConnected} collabEnabled={collabEnabled} />
              </div>
              {collabEnabled && <CollabPanel section="setup" />}
            </div>
            {collabEnabled && (
              <>
                <div className="hidden md:block w-px bg-border self-stretch" />
                <div className="flex-1 min-w-0">
                  <CollabPanel section="teams" />
                </div>
              </>
            )}
          </div>
          <CollabGuideModal open={showGuide} onOpenChange={o => { if (!o) dismissGuide() }} onEnable={dismissGuide} confirmLabel={t.collabGuideGotIt} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
