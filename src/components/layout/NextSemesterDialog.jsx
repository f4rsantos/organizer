import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getNextPresetKey } from '@/lib/presets'
import { PresetOverlay } from '@/components/presets/PresetOverlay'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function NextSemesterDialog() {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const dismissed = useStore(s => s.dismissedNextSemester ?? {})
  const dismissNextSemester = useStore(s => s.dismissNextSemester)
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)
  const [showPresets, setShowPresets] = useState(false)

  const sem = semesters.find(s => s.id === activeSemesterId)
  if (!sem?.endDate || !sem?.presetKey) return null

  const ended = new Date(sem.endDate) < new Date()
  const nextKey = getNextPresetKey(sem.presetKey)
  if (!ended || !nextKey || dismissed[activeSemesterId]) return null

  return (
    <>
      <Dialog open={!showPresets} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t.nextSemesterTitle}</DialogTitle>
            <DialogDescription>{t.nextSemesterDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => setShowPresets(true)}>{t.loadNextSemester}</Button>
            <Button variant="ghost" onClick={() => dismissNextSemester(activeSemesterId)}>
              {t.dismissNextSemester}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {showPresets && <PresetOverlay open={true} onClose={() => setShowPresets(false)} />}
    </>
  )
}
