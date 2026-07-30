import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PassphraseField({ label, value, onChange, placeholder, autoFocus, onEnter }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="password"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
      />
    </div>
  )
}

export function RecoveryCodeField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs transition-colors outline-none resize-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export function HintField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
