import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function GoalNoteDialog({ open, onOpenChange, onSubmit, t }) {
  const [note, setNote] = useState('')

  const submit = () => {
    onSubmit(note.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-4" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.goalNotePrompt}</DialogTitle>
        </DialogHeader>
        <Input
          className="h-9"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t.goalNotePlaceholder}
          onKeyDown={e => e.key === 'Enter' && note.trim() && submit()}
        />
        <DialogFooter className="-mx-4 -mb-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={submit} disabled={!note.trim()}>{t.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
