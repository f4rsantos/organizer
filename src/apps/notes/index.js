import { StickyNote } from 'lucide-react'
import { NotesAppModal } from '@/components/settings/apps/NotesAppModal'
import { NotesTab } from '@/components/notes/NotesTab'

export const notesApp = {
  id: 'notes',
  labelKey: 'notes',
  icon: StickyNote,
  keywords: ['notes', 'notas', 'markdown', 'text', 'write'],
  isEnabled: state => state.settings?.apps?.notes === true,
  setEnabled: (updateSettings, apps, value) => updateSettings({ apps: { ...apps, notes: value } }),
  wipe: state => ({ ...state, notes: [], noteFolders: [] }),
  SettingsModal: NotesAppModal,
  tab: { id: 'notes', component: NotesTab },
}
