import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { nanoid } from '@/lib/ids'

function WeightInput({ weight, onChange }) {
  const [raw, setRaw] = useState(null)
  const pct = parseFloat(((weight || 0) * 100).toFixed(1))

  return (
    <Input
      className="w-16 h-8 text-sm text-center" type="number" min={0} max={100} step={0.1} placeholder="%"
      value={raw ?? pct}
      onFocus={() => setRaw(pct)}
      onBlur={() => { onChange(Number(raw) / 100); setRaw(null) }}
      onChange={e => setRaw(e.target.value)}
    />
  )
}

export function GradeConfigForm({ semesterId, cls, components }) {
  const setGradeComponents = useStore(s => s.setGradeComponents)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const addComponent = () => {
    const updated = [...components, { id: nanoid(), name: '', weight: 0.25, grade: null }]
    setGradeComponents(semesterId, cls.id, updated)
  }

  const updateComponent = (id, field, value) => {
    const updated = components.map(c => c.id === id ? { ...c, [field]: value } : c)
    setGradeComponents(semesterId, cls.id, updated)
  }

  const removeComponent = id => {
    setGradeComponents(semesterId, cls.id, components.filter(c => c.id !== id))
  }

  const totalWeight = components.reduce((s, c) => s + (Number(c.weight) || 0), 0)

  return (
    <div className="space-y-2">
      {components.map(comp => (
        <div key={comp.id} className="flex items-center gap-2">
          <Input className="flex-1 h-8 text-sm" placeholder={t.componentName} value={comp.name}
            onChange={e => updateComponent(comp.id, 'name', e.target.value)} />
          <WeightInput weight={comp.weight} onChange={v => updateComponent(comp.id, 'weight', v)} />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeComponent(comp.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <span className={`text-xs ${Math.abs(totalWeight - 1) < 0.01 ? 'text-muted-foreground' : 'text-destructive'}`}>
          Total: {parseFloat((totalWeight * 100).toFixed(1))}%
        </span>
        <Button variant="ghost" size="sm" onClick={addComponent} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> {t.addComponent}
        </Button>
      </div>
    </div>
  )
}
