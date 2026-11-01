import { CloudLightning, CloudRain, PartyPopper, Snowflake, Target, ThermometerSnowflake, ThermometerSun } from 'lucide-react'

const NOTE_META = {
  holiday: { icon: PartyPopper, text: (t, note) => t.todayNoteHoliday(note.name) },
  rain: { icon: CloudRain, text: (t, note) => t.todayNoteRain(note.from) },
  snow: { icon: Snowflake, text: t => t.todayNoteSnow },
  storm: { icon: CloudLightning, text: t => t.todayNoteStorm },
  hot: { icon: ThermometerSun, text: t => t.todayNoteHot },
  cold: { icon: ThermometerSnowflake, text: t => t.todayNoteCold },
  habits: { icon: Target, text: (t, note) => t.todayNoteHabits(note.count) },
}

export function NotesStrip({ t, notes }) {
  return (
    <ul aria-label={t.todayNotesTitle} className="flex flex-wrap gap-2">
      {notes.map(note => {
        const { icon: Icon, text } = NOTE_META[note.kind]
        return (
          <li key={note.kind}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs backdrop-blur-xl">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{text(t, note)}</span>
          </li>
        )
      })}
    </ul>
  )
}
