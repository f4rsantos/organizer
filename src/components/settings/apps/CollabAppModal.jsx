import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { loadFirebaseConfig } from '@/lib/firebase'
import { CollabConnectButton } from '../CollabConnectPanel'
import { CollabPanel } from '../CollabPanel'

export function CollabAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const firebaseConnected = !!loadFirebaseConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.collabApp}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <CollabConnectButton firebaseConnected={firebaseConnected} collabEnabled={collabEnabled} />
          </div>
          {firebaseConnected && collabEnabled && <CollabPanel />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
