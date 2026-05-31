import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { checkPresetUpdateAvailable } from '@/lib/presetsFirebase'
import { fetchPreset, updatePreset } from '@/lib/presets'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export function PresetUpdateDialog() {
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const semesters = useStore(s => s.semesters)
  const presetUpdatedAt = useStore(s => s.presetUpdatedAt ?? {})
  const lang = useStore(s => s.lang ?? 'pt')
  const t = useStrings(lang)

  const addClass = useStore(s => s.addClass)
  const addHoliday = useStore(s => s.addHoliday)
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const setTargetGrade = useStore(s => s.setTargetGrade)
  const addTask = useStore(s => s.addTask)
  const updateSemester = useStore(s => s.updateSemester)
  const setPresetUpdatedAt = useStore(s => s.setPresetUpdatedAt)

  const [available, setAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  const semester = semesters.find(s => s.id === activeSemesterId)

  useEffect(() => {
    if (!semester?.presetKey) return
    let cancelled = false
    const stored = presetUpdatedAt[semester.presetKey] ?? null
    checkPresetUpdateAvailable(semester.presetKey, stored).then(result => {
      if (!cancelled) setAvailable(result)
    })
    return () => { cancelled = true }
  }, [semester?.presetKey, activeSemesterId])

  const handleUpdate = async () => {
    if (!semester?.presetKey || !activeSemesterId) return
    setUpdating(true)
    try {
      const data = await fetchPreset(semester.presetKey, setPresetUpdatedAt)
      const getClasses = () => useStore.getState().classes
      const getState = () => useStore.getState()
      updatePreset(activeSemesterId, data, { addClass, addHoliday, setGradeComponents, setTargetGrade, addTask, updateSemester, getClasses, getState })
      setAvailable(false)
    } catch {
    } finally {
      setUpdating(false)
    }
  }

  if (!available) return null

  return (
    <Dialog open={true} onOpenChange={open => !open && setAvailable(false)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{lang === 'pt' ? 'Preset atualizado' : 'Preset updated'}</DialogTitle>
          <DialogDescription>{lang === 'pt' ? 'Queres aplicar as alterações?' : 'Apply the changes to your current semester?'}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setAvailable(false)} disabled={updating}>
            {lang === 'pt' ? 'Ignorar' : 'Dismiss'}
          </Button>
          <Button onClick={handleUpdate} disabled={updating}>
            {updating ? '…' : (lang === 'pt' ? 'Atualizar' : 'Update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
