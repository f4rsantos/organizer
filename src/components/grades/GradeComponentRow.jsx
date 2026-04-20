import { GradeInput } from './GradeInput'
import { SubcomponentRow } from './SubcomponentRow'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function GradeComponentRow({ component, onChange, onAddSub, onRemoveSub, onSubGradeChange }) {
  const pct = parseFloat(((component.weight || 0) * 100).toFixed(1))
  const subs = component.subcomponents ?? []
  const subWeight = subs.length > 0 ? component.weight / subs.length : 0
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <div className="border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{component.name || 'Unnamed'}</p>
          <p className="text-xs text-muted-foreground">{pct}%</p>
        </div>
        {subs.length === 0
          ? <GradeInput value={component.grade} onChange={v => onChange(component.id, v)} className="w-20 h-8 text-center text-sm" />
          : <span className="w-20 text-center text-xs text-muted-foreground">{subs.length} parts</span>
        }
        <button onClick={() => onAddSub(component.id)}
          className="text-muted-foreground hover:text-primary p-1 rounded"
          title={t.addPartTitle}>
          <Plus size={14} />
        </button>
      </div>
      {subs.map(s => (
        <SubcomponentRow key={s.id} sub={s} subWeight={subWeight}
          onGradeChange={(id, v) => onSubGradeChange(component.id, id, v)}
          onRemove={id => onRemoveSub(component.id, id)}
        />
      ))}
    </div>
  )
}
