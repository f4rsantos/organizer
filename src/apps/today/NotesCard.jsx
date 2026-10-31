import { CloudLightning, CloudRain, Info, PartyPopper, Snowflake, Target, ThermometerSnowflake, ThermometerSun } from 'lucide-react'
import { GlassPanel } from '@/components/common/GlassPanel'

const NOTE_META = {
  holiday: { icon: PartyPopper, text: (t, note) => t.todayNoteHoliday(note.name) },
  rain: { icon: CloudRain, text: (t, note) => t.todayNoteRain(note.from) },
  snow: { icon: Snowflake, text: t => t.todayNoteSnow },
  storm: { icon: CloudLightning, text: t => t.todayNoteStorm },
  hot: { icon: ThermometerSun, text: t => t.todayNoteHot },
  cold: { icon: ThermometerSnowflake, text: t => t.todayNoteCold },
  habits: { icon: Target, text: (t, note) => t.todayNoteHabits(note.count) },
}

export function NotesCard({ t, notes }) {
  return (
    <GlassPanel className="p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Info className="h-3.5 w-3.5" />{t.todayNotesTitle}
      </p>
      <ul className="space-y-2">
        {notes.map(note => {
          const { icon: Icon, text } = NOTE_META[note.kind]
          return (
            <li key={note.kind} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{text(t, note)}</span>
            </li>
          )
        })}
      </ul>
    </GlassPanel>
  )
}
