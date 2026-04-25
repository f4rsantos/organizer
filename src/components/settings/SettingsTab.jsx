import { useRef, useState } from 'react'
import { Download, Upload, Link, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
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
import { FirebaseSyncButton } from './FirebaseSyncPanel'
import { FirebaseGuideModal } from './FirebaseSyncPanel'
import { DangerZone } from './DangerZone'
import { CollabPanel } from './CollabPanel'
import { CollabConnectButton } from './CollabConnectPanel'
import { GeneralSettings } from './GeneralSettings'
import { KanbanSettings } from './KanbanSettings'
import { FocusSettings } from './FocusSettings'
import { HolidaysForm } from './HolidaysForm'
import { PresetOverlay } from '@/components/presets/PresetOverlay'
import { exportState, importState } from '@/store/persist'
import { encodeStateToUrl } from '@/lib/shareUtils'
import { loadFirebaseConfig } from '@/lib/firebase'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

function DataPanel({ syncStatus }) {
  const state = useStore(s => s)
  const importData = useStore(s => s.importData)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const fileRef = useRef(null)
  const [importError, setImportError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const firebaseConnected = !!loadFirebaseConfig()

  const handleExport = () => exportState(state)

  const handleImport = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setImportError(null); importData(await importState(file)) }
    catch { setImportError(lang === 'pt' ? 'Ficheiro inválido.' : 'Invalid file.') }
    e.target.value = ''
  }

  const getShareUrl = () => {
    const { setCourseAvg, setSemesterFinalGrade, setGradeComponents, setTargetGrade,
      addTask, toggleTask, updateTask, deleteTask, addKanbanCard, updateKanbanCard,
      moveKanbanCard, deleteKanbanCard, clearKanbanDone, wipeKanban, addKanbanColumn,
      updateKanbanColumn, deleteKanbanColumn, addClass, updateClass, deleteClass,
      addSemester, updateSemester, deleteSemester, setActiveSemester,
      setTheme, setLang, completeOnboarding, updateSettings, importData: _i,
      updateFocusSettings, updatePomodoroSettings, addPomodoro, clearPomodoros,
      dismissNextSemester, addHoliday, deleteHoliday,
      dismissTaskAlert, setTaskAlertReminder, clearTaskAlertState,
      ...data } = state
    return encodeStateToUrl(data)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getShareUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQr = async () => {
    if (showQr) { setShowQr(false); return }
    const url = getShareUrl()
    setQrDataUrl(url.length > 4000 ? 'toolarge' : await QRCode.toDataURL(url, { width: 200, margin: 1 }))
    setShowQr(true)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> {t.exportJson}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> {t.importJson}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleCopy}>
          <Link className="h-4 w-4" /> {copied ? t.linkCopied : t.shareLink}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleQr}>
          <QrCode className="h-4 w-4" /> {t.qrCode}
        </Button>
        <FirebaseSyncButton syncStatus={syncStatus} />
        <CollabConnectButton firebaseConnected={firebaseConnected} collabEnabled={collabEnabled} />
      </div>
      {importError && <p className="text-xs text-destructive">{importError}</p>}
      {showQr && (
        <div className="flex justify-center pt-1">
          {qrDataUrl === 'toolarge'
            ? <p className="text-xs text-muted-foreground text-center">Data too large for QR. Use JSON export instead.</p>
            : <img src={qrDataUrl} alt="QR" className="rounded-lg border border-border" width={200} height={200} />
          }
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  )
}

export function SettingsTab({ syncStatus }) {
  const semesters = useStore(s => s.semesters)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const setActiveSemester = useStore(s => s.setActiveSemester)
  const allClasses = useStore(s => s.classes)
  const grades = useStore(s => s.grades)
  const kanban = useStore(s => s.kanban)
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const dismissed = useStore(s => s.dismissedNextSemester ?? {})
  const importData = useStore(s => s.importData)

  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const semester = semesters.find(s => s.id === activeSemesterId) ?? null
  const classes = allClasses.filter(c => c.semesterId === activeSemesterId)
  const hasValidDates = !!semester?.startDate && !!semester?.endDate
  const hasClasses = classes.length > 0

  const [showPresets, setShowPresets] = useState(false)
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false)
  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)
  const firebaseConnected = !!loadFirebaseConfig()
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importState(file)
      importData(data)
    } catch {
      setImportError(lang === 'pt' ? 'Ficheiro inválido.' : 'Invalid file.')
    }
    e.target.value = ''
  }

  const semesterEnded = semester?.endDate && new Date(semester.endDate) < new Date()
  const showNextSemesterHint = semesterEnded && semester?.presetKey && !dismissed[activeSemesterId]

  if (!semesters.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="space-y-5 p-4 pt-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{t.settings}</h1>
            <div className="flex items-center gap-1">
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
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        {semesters.length > 1 && (
          <Select value={activeSemesterId} onValueChange={setActiveSemester}>
            <SelectTrigger>
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent position="popper">
              {semesters.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Accordion type="multiple" defaultValue={[]} className="space-y-2">
          <AccordionItem value="semester" className="rounded-xl border border-border bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold py-3">{t.semester}</AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              <SemesterDatesForm />
              {semester && (
                <div className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm">
                  <span className="font-medium">{semester.name}</span>
                  <span className="ml-2 text-muted-foreground">{semester.startDate} → {semester.endDate}</span>
                </div>
              )}
              {showNextSemesterHint && (
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">{t.nextSemesterDesc}</span>
                  <Button size="sm" variant="outline" className="ml-3 shrink-0 text-xs"
                    onClick={() => setShowPresets(true)}>
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
            <AccordionItem value="classes" className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-sm font-semibold py-3">{workMode ? t.groups : t.classes}</AccordionTrigger>
              <AccordionContent className="pb-4">
                <ClassesForm semesterId={activeSemesterId} classes={classes} workMode={workMode} />
              </AccordionContent>
            </AccordionItem>
          )}

          {hasValidDates && (
            <AccordionItem value="holidays" className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-sm font-semibold py-3">{t.holidays}</AccordionTrigger>
              <AccordionContent className="pb-4">
                <HolidaysForm semesterId={activeSemesterId} />
              </AccordionContent>
            </AccordionItem>
          )}

          {hasValidDates && hasClasses && (
            <>
              {!workMode && (
                <AccordionItem value="grades" className="rounded-xl border border-border bg-card px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">{t.gradeComponents}</AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-5">
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

              <AccordionItem value="kanban" className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold py-3">{t.kanban}</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <KanbanSettings semesterId={activeSemesterId} columns={kanban[activeSemesterId]?.columns ?? []} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="focus" className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold py-3">{t.focus}</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <FocusSettings />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="general" className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold py-3">{t.general}</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <GeneralSettings />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data" className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold py-3">{t.data}</AccordionTrigger>
                <AccordionContent className="pb-4">
                  <DataPanel syncStatus={syncStatus} />
                </AccordionContent>
              </AccordionItem>

              {firebaseConnected && collabEnabled && (
                <AccordionItem value="collab" className="rounded-xl border border-border bg-card px-4">
                  <AccordionTrigger className="text-sm font-semibold py-3">Organizer Collab</AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <CollabPanel />
                  </AccordionContent>
                </AccordionItem>
              )}
            </>
          )}
        </Accordion>

        {hasValidDates && <DangerZone semesterId={activeSemesterId} />}

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

      <PresetOverlay open={showPresets} onClose={() => setShowPresets(false)} />
    </div>
  )
}
