import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ClassColorDot } from './ClassColorDot'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ClassesForm({ semesterId, classes, workMode = false }) {
  const [form, setForm] = useState({ name: '', ects: 6, color: '#6366f1' })
  const [deleteId, setDeleteId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', ects: 6, color: '#6366f1' })
  const addClass = useStore(s => s.addClass)
  const deleteClass = useStore(s => s.deleteClass)
  const updateClass = useStore(s => s.updateClass)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const handleAdd = e => {
    e.preventDefault()
    if (!form.name.trim()) return
    addClass({ semesterId, ...form, ects: workMode ? 0 : form.ects })
    setForm({ name: '', ects: 6, color: '#6366f1' })
  }

  const startEdit = cls => {
    setEditId(cls.id)
    setEditForm({ name: cls.name, ects: cls.ects, color: cls.color })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ name: '', ects: 6, color: '#6366f1' })
  }

  const saveEdit = () => {
    if (!editId || !editForm.name.trim()) return
    updateClass(editId, {
      name: editForm.name.trim(),
      ects: workMode ? 0 : (Number.isFinite(editForm.ects) ? editForm.ects : 0),
      color: editForm.color,
    })
    cancelEdit()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{workMode ? t.groupName : t.className}</Label>
          <Input placeholder="e.g. Cálculo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="flex gap-3 items-end">
          {!workMode && (
            <div className="space-y-1.5 w-24">
              <Label>{t.ects}</Label>
              <Input type="number" min={0} max={30} value={form.ects} onChange={e => setForm(f => ({ ...f, ects: Number(e.target.value) }))} />
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            <Label>{t.colour}</Label>
            <ClassColorDot color={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
          </div>
        </div>
        <Button type="submit" variant="outline" className="w-full">{workMode ? t.addAGroup : t.addAClass}</Button>
      </form>

      <div className="space-y-2">
        {classes.map(cls => (
          <div key={cls.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            {editId === cls.id ? (
              <>
                <ClassColorDot color={editForm.color} onChange={c => setEditForm(f => ({ ...f, color: c }))} />
                <Input className="h-8 flex-1" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                {!workMode && (
                  <Input type="number" min={0} max={30} className="h-8 w-20"
                    value={editForm.ects}
                    onChange={e => setEditForm(f => ({ ...f, ects: Number(e.target.value) }))} />
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={saveEdit}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                <span className="flex-1 text-sm font-medium">{cls.name}</span>
                {!workMode && <span className="text-xs text-muted-foreground">{cls.ects} ECTS</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(cls)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(cls.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}
        title={workMode ? t.deleteGroupTitle : t.deleteClassTitle}
        description={workMode ? t.deleteGroupDesc : t.deleteClassDesc}
        onConfirm={() => deleteClass(deleteId)} />
    </div>
  )
}
