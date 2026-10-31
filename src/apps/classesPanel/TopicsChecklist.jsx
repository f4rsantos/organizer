import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { nanoid } from '@/lib/ids'
import { cn } from '@/lib/utils'

function TopicRow({ t, topic, onToggle, onRemove }) {
  return (
    <div className="group flex items-center gap-2.5">
      <Checkbox checked={topic.done} onCheckedChange={onToggle} />
      <span className={cn('min-w-0 flex-1 text-sm', topic.done && 'text-muted-foreground line-through')}>{topic.text}</span>
      <Button variant="ghost" size="icon" aria-label={t.delete} onClick={onRemove}
        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 touch:opacity-100 hover:text-destructive">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function TopicsChecklist({ t, topics, onChange }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text) return
    onChange([...topics, { id: nanoid(), text, done: false }])
    setDraft('')
  }
  const toggle = (id, done) => onChange(topics.map(topic => (topic.id === id ? { ...topic, done } : topic)))
  const remove = id => onChange(topics.filter(topic => topic.id !== id))

  return (
    <div className="space-y-1.5">
      {topics.map(topic => (
        <TopicRow key={topic.id} t={t} topic={topic}
          onToggle={done => toggle(topic.id, done)} onRemove={() => remove(topic.id)} />
      ))}
      <Input className="h-8 text-sm" value={draft} placeholder={t.classesTopicPlaceholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        onBlur={add} />
    </div>
  )
}
