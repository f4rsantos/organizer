import { TasksPanel } from '@/components/layout/onboarding/TasksScene'
import { KanbanPanel } from '@/components/layout/onboarding/KanbanScene'
import { CalendarPanel } from '@/components/layout/onboarding/CalendarScene'
import { FocusPanel } from '@/components/layout/onboarding/FocusScene'
import { SettingsPanel } from '@/components/layout/onboarding/SettingsScene'
import { SharePanel } from '@/components/layout/onboarding/ShareScene'
import { GradesScene } from './GradesScene'
import { NotesScene } from './NotesScene'
import { EisenhowerScene } from './EisenhowerScene'
import { QuickActionScene } from './QuickActionScene'
import { GoogleCalendarScene } from './GoogleCalendarScene'
import { EiCalendarScene } from './EiCalendarScene'
import { PomodoroScene } from './PomodoroScene'
import { StandbyScene } from './StandbyScene'
import { FirebaseSyncScene } from './FirebaseSyncScene'
import { CollabScene } from './CollabScene'

// Guide id -> scene. Onboarding panels are reused where they already cover the
// topic; they take label props, so each is wrapped to read from `t`.
export const GUIDE_SCENES = {
  tasks: ({ t }) => <TasksPanel groupLabels={[t.tasks, t.other]} />,
  kanban: ({ columns }) => <KanbanPanel columns={columns} />,
  grades: GradesScene,
  calendar: ({ t }) => <CalendarPanel views={[t.viewDay, t.viewWeek, t.viewMonth, t.viewYear]} weekdays={t.weekdaysShort?.map(d => d[0])} />,
  focus: ({ t }) => (
    <FocusPanel labels={{
      ready: t.focusReady, focusing: t.focus, break: t.focusBreak,
      start: t.focusStart, pause: t.focusPause, reset: t.focusReset,
      skip: t.skip,
    }} />
  ),
  notes: NotesScene,
  eisenhower: EisenhowerScene,
  quickAction: QuickActionScene,
  googleCalendar: GoogleCalendarScene,
  eiCalendar: EiCalendarScene,
  pomodoro: PomodoroScene,
  standby: StandbyScene,
  firebaseSync: FirebaseSyncScene,
  collab: CollabScene,
  dataTransfer: ({ t }) => <SharePanel labels={{ export: t.exportJson, import: t.importJson }} />,
  settings: ({ t }) => <SettingsPanel rows={[t.general, t.apps, t.data]} />,
}
