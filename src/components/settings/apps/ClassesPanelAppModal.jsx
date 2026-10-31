import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { DEFAULT_STUDY_TYPES } from '@/lib/classes/lessons'
import { LESSON_TYPES } from '@/lib/classes/classEvents'
import { useClassesSettings } from '@/apps/classesPanel/useClassesSettings'
import { lessonTypeLabel, studyTypeLabel } from '@/apps/classesPanel/labels'
import { SettingList, SettingRow, SettingSelect } from '../SettingRow'
import { EditableEntryList } from './EditableEntryList'

const BUILT_IN_LESSON_TYPES = LESSON_TYPES.map(id => ({ id }))

export function ClassesPanelAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const settings = useClassesSettings()
  const updateSettings = useStore(s => s.updateSettings)
  const save = patch => updateSettings({ classesPanel: { ...settings, ...patch } })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.classesPanel}</DialogTitle>
        </DialogHeader>
        <SettingList>
          <SettingSelect label={t.classesViewMode} desc={t.classesViewModeDesc} value={settings.view}
            onChange={view => save({ view })}
            options={[{ value: 'overview', label: t.classesViewOverview }, { value: 'table', label: t.classesViewTable }]} />
          <SettingRow label={t.classesStudyTypes} desc={t.classesStudyTypesDesc}>
            <EditableEntryList entries={settings.studySteps} builtIns={DEFAULT_STUDY_TYPES}
              labelOf={entry => studyTypeLabel(t, entry)} placeholder={t.classesStudyAddPlaceholder}
              removeLabel={t.delete} onChange={studySteps => save({ studySteps })} />
          </SettingRow>
          <SettingRow label={t.classesLessonTypes} desc={t.classesLessonTypesDesc}>
            <EditableEntryList entries={settings.lessonTypes} builtIns={BUILT_IN_LESSON_TYPES}
              labelOf={entry => lessonTypeLabel(t, entry.id, settings.lessonTypes)} placeholder={t.classesLessonTypeAddPlaceholder}
              removeLabel={t.delete} onChange={lessonTypes => save({ lessonTypes })} />
          </SettingRow>
        </SettingList>
      </DialogContent>
    </Dialog>
  )
}
