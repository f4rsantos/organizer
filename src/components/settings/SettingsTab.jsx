import { useEffect, useMemo, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LangToggle } from '@/components/common/LangToggle'
import { Button } from '@/components/ui/button'
import { SemesterDatesForm } from './SemesterDatesForm'
import { ClassesForm } from './ClassesForm'
import { GradeConfigForm } from './GradeConfigForm'
import { GradeScaleSettings } from './GradeScaleSettings'
import { FirebaseGuideModal } from './FirebaseSyncPanel'
import { DangerZone } from './DangerZone'
import { GeneralSettings } from './GeneralSettings'
import { TaskSettings } from './TaskSettings'
import { NavbarSettings } from './NavbarSettings'
import { AppsGrid } from './AppsGrid'
import { DataPanel } from './DataPanel'
import { SettingsSearch } from './SettingsSearch'
import { APP_PLUGINS } from '@/apps/registry'
import { SettingsGroup, SectionTrigger } from './SettingsSection'
import { KanbanSettings } from './KanbanSettings'
import { FocusSettings } from './FocusSettings'
import { NotificationBellSettings } from './notifications/NotificationBellSettings'
import { HolidaysForm } from './HolidaysForm'
import { CalendarSettings } from './CalendarSettings'
import { PresetOverlay } from '@/components/presets/PresetOverlay'
import { GuidesOverlay } from '@/components/guides/GuidesOverlay'
import { importState } from '@/store/persist'
import { loadFirebaseConfig } from '@/lib/firebase'

const ALWAYS_AVAILABLE_SECTIONS = ['semester', 'tasks', 'calendar', 'focus', 'notifications', 'general', 'navbar', 'data', 'apps']
const REVEAL_FLASH_MS = 1600

function availableSections({ hasValidDates, hasClasses, workMode }) {
  const sections = new Set(ALWAYS_AVAILABLE_SECTIONS)
  if (hasValidDates) ['classes', 'holidays', 'kanban'].forEach(s => sections.add(s))
  if (hasValidDates && hasClasses && !workMode) sections.add('grades')
  return sections
}

function useSectionSummaries({ t, semester, classes, workMode, firebaseConnected }) {
  const theme = useStore(s => s.theme ?? 'system')
  const enabledApps = useStore(s => APP_PLUGINS.filter(p => p.isEnabled(s) && (!p.isVisible || p.isVisible(s))).map(p => p.labelKey).join(','))
  const themeLabels = { light: t.themeLight, dark: t.themeDark, system: t.themeSystem }
  return {
    semester: semester?.name ?? null,
    classes: workMode ? t.obSummaryGroups(classes.length) : t.obSummaryClasses(classes.length),
    general: themeLabels[theme] ?? null,
    data: firebaseConnected ? t.firebaseConnected : null,
    apps: enabledApps ? enabledApps.split(',').map(key => t[key]).join(', ') : null,
  }
}

function findLabelElement(root, label) {
  const candidates = root.querySelectorAll('label, p, span, h3, button')
  return [...candidates].find(el => el.textContent.trim() === label) ?? root
}

function revealSetting({ section, label }) {
  const root = document.getElementById(`settings-section-${section}`)
  if (!root) return
  const target = findLabelElement(root, label)
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.animate?.(
    [{ backgroundColor: 'color-mix(in oklch, var(--primary) 22%, transparent)' }, { backgroundColor: 'transparent' }],
    { duration: REVEAL_FLASH_MS, easing: 'ease-out' },
  )
}

export function SettingsTab({ syncStatus }) {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const allClasses = useStore(s => s.classes)
  const grades = useStore(s => s.grades)
  const kanban = useStore(s => s.kanban)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const dismissed = useStore(s => s.dismissedNextSemester ?? {})
  const reopenNextSemester = useStore(s => s.reopenNextSemester)
  const importData = useStore(s => s.importData)

  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const scopeId = noneMode ? null : activeSemesterId
  const semester = semesters.find(s => s.id === activeSemesterId) ?? null
  const classes = allClasses.filter(c => c.semesterId === scopeId)
  const hasValidDates = noneMode || (!!semester?.startDate && !!semester?.endDate)
  const hasClasses = noneMode || classes.length > 0

  const [showPresets, setShowPresets] = useState(false)
  const [showGuides, setShowGuides] = useState(false)
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false)
  const [importError, setImportError] = useState(null)
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState([])
  const [pendingReveal, setPendingReveal] = useState(null)
  const fileInputRef = useRef(null)
  const firebaseConnected = !!loadFirebaseConfig()
  const sections = useMemo(
    () => availableSections({ hasValidDates, hasClasses, workMode }),
    [hasValidDates, hasClasses, workMode],
  )
  const searching = query.trim().length > 0
  const summaries = useSectionSummaries({ t, semester, classes, workMode, firebaseConnected })

  const settingsSearchRequest = useStore(s => s.settingsSearchRequest)
  const clearSettingsSearchRequest = useStore(s => s.clearSettingsSearchRequest)
  useEffect(() => {
    if (settingsSearchRequest === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(settingsSearchRequest)
    clearSettingsSearchRequest()
  }, [settingsSearchRequest, clearSettingsSearchRequest])

  useEffect(() => {
    if (!pendingReveal) return
    const frame = requestAnimationFrame(() => revealSetting(pendingReveal))
    return () => cancelAnimationFrame(frame)
  }, [pendingReveal])

  const reveal = (section, label) => {
    setQuery('')
    setOpenSections([section])
    setPendingReveal({ section, label })
  }

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importState(file)
      importData(data, { preferLocalSettings: false })
    } catch {
      setImportError(lang === 'pt' ? 'Ficheiro inválido.' : 'Invalid file.')
    }
    e.target.value = ''
  }

  const semesterEnded = semester?.endDate && new Date(semester.endDate) < new Date()
  const showNextSemesterHint = semesterEnded && semester?.presetKey && dismissed[activeSemesterId]

  if (!semesters.length && !noneMode) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="space-y-5 p-4 pt-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t.settings}</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label={t.guides} onClick={() => setShowGuides(true)}>
                <Info className="h-4 w-4" />
              </Button>
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
          <Accordion type="multiple" defaultValue={[]} className="space-y-2">
            <AccordionItem value="semester" className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-sm font-semibold py-3">{t.semester}</AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <SemesterDatesForm />
                <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                  <Button variant="outline" className="w-full" onClick={() => setShowPresets(true)}>{t.loadPreset}</Button>
                  <Button variant="ghost" className="w-full" onClick={() => fileInputRef.current?.click()}>{t.importData}</Button>
                  {!firebaseConnected && (
                    <Button variant="outline" className="w-full" onClick={() => setShowFirebaseGuide(true)}>{t.importFromFirebase}</Button>
                  )}
                  {importError && <p className="text-sm text-destructive">{importError}</p>}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <PresetOverlay open={showPresets} onClose={() => setShowPresets(false)} />
          <GuidesOverlay open={showGuides} onClose={() => setShowGuides(false)} />
          {showFirebaseGuide && <FirebaseGuideModal onClose={() => setShowFirebaseGuide(false)} syncStatus={syncStatus} />}
          <p className="pt-1 text-center text-[11px] text-muted-foreground/70">
            <a
              href="https://github.com/f4rsantos"
              target="_blank"
              rel="noreferrer"
              className="text-inherit no-underline hover:no-underline"
            >
              Made by f4rsantos
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-5 p-4 pt-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t.settings}</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label={t.guides} onClick={() => setShowGuides(true)}>
              <Info className="h-4 w-4" />
            </Button>
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        <SettingsSearch query={query} onQueryChange={setQuery} sections={sections} onReveal={reveal} />

        {!searching && (
          <Accordion value={openSections} onValueChange={setOpenSections} className="space-y-5">
            <SettingsGroup label={t.settingsGroupTerm}>
              <AccordionItem id="settings-section-semester" value="semester" className="px-4">
                <SectionTrigger section="semester" summary={summaries.semester}>{t.semester}</SectionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  <SemesterDatesForm semester={semester} />
                  {showNextSemesterHint && (
                    <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{t.nextSemesterDesc}</span>
                      <Button size="sm" variant="outline" className="ml-3 shrink-0 text-xs"
                        onClick={() => reopenNextSemester(activeSemesterId)}>
                        {t.loadNextSemester}
                      </Button>
                    </div>
                  )}
                  {!hasValidDates && (
                    <p className="text-xs text-muted-foreground">{t.addUnlocks}</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {hasValidDates && (
                <AccordionItem id="settings-section-classes" value="classes" className="px-4">
                  <SectionTrigger section="classes" summary={summaries.classes}>{workMode ? t.groups : t.classes}</SectionTrigger>
                  <AccordionContent className="pb-4">
                    <ClassesForm semesterId={activeSemesterId} classes={classes} workMode={workMode} />
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasValidDates && (
                <AccordionItem id="settings-section-holidays" value="holidays" className="px-4">
                  <SectionTrigger section="holidays">{t.holidays}</SectionTrigger>
                  <AccordionContent className="pb-4">
                    <HolidaysForm semesterId={activeSemesterId} />
                  </AccordionContent>
                </AccordionItem>
              )}

              {hasValidDates && hasClasses && !workMode && (
                <AccordionItem id="settings-section-grades" value="grades" className="px-4">
                  <SectionTrigger section="grades">{t.gradeComponents}</SectionTrigger>
                  <AccordionContent className="pb-4 space-y-5">
                    <GradeScaleSettings />
                    {classes.map(cls => (
                      <div key={cls.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
                          <span className="text-sm font-medium">{cls.name}</span>
                        </div>
                        <GradeConfigForm semesterId={activeSemesterId} cls={cls}
                          components={grades[activeSemesterId]?.[cls.id]?.components ?? []} />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

            </SettingsGroup>
            <SettingsGroup label={t.settingsGroupWorkflow}>
              <AccordionItem id="settings-section-tasks" value="tasks" className="px-4">
                <SectionTrigger section="tasks">{t.tasks}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <TaskSettings />
                </AccordionContent>
              </AccordionItem>

              {hasValidDates && (
                <AccordionItem id="settings-section-kanban" value="kanban" className="px-4">
                  <SectionTrigger section="kanban">{t.kanban}</SectionTrigger>
                  <AccordionContent className="pb-4">
                    <KanbanSettings semesterId={activeSemesterId} columns={kanban[activeSemesterId]?.columns ?? []} />
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem id="settings-section-calendar" value="calendar" className="px-4">
                <SectionTrigger section="calendar">{t.calendar}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <CalendarSettings
                    semesterId={activeSemesterId}
                    semesterStart={semester?.startDate ?? null}
                    semesterEnd={semester?.endDate ?? null}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem id="settings-section-focus" value="focus" className="px-4">
                <SectionTrigger section="focus">{t.focus}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <FocusSettings />
                </AccordionContent>
              </AccordionItem>

            </SettingsGroup>
            <SettingsGroup label={t.settingsGroupApp}>
              <AccordionItem id="settings-section-notifications" value="notifications" className="px-4">
                <SectionTrigger section="notifications">{t.notifications}</SectionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <NotificationBellSettings />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem id="settings-section-general" value="general" className="px-4">
                <SectionTrigger section="general" summary={summaries.general}>{t.general}</SectionTrigger>
                <AccordionContent className="pb-4 space-y-4">
                  <GeneralSettings />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem id="settings-section-navbar" value="navbar" className="px-4">
                <SectionTrigger section="navbar">{t.navbar}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <NavbarSettings />
                </AccordionContent>
              </AccordionItem>

            </SettingsGroup>
            <SettingsGroup label={t.settingsGroupData}>
              <AccordionItem id="settings-section-data" value="data" className="px-4">
                <SectionTrigger section="data" summary={summaries.data}>{t.data}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <DataPanel syncStatus={syncStatus} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem id="settings-section-apps" value="apps" className="px-4">
                <SectionTrigger section="apps" summary={summaries.apps}>{t.apps}</SectionTrigger>
                <AccordionContent className="pb-4">
                  <AppsGrid />
                </AccordionContent>
              </AccordionItem>
            </SettingsGroup>
          </Accordion>
        )}

        {hasValidDates && !searching && <DangerZone semesterId={activeSemesterId} />}

        <p className="pt-1 text-center text-[12px] text-muted-foreground/70">
          <a
            href="https://github.com/f4rsantos"
            target="_blank"
            rel="noreferrer"
            className="text-inherit no-underline hover:no-underline"
          >
            Made by f4rsantos
          </a>
        </p>
      </div>

      <GuidesOverlay open={showGuides} onClose={() => setShowGuides(false)} />
    </div>
  )
}
