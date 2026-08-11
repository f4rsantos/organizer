import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useFirebaseSync } from '@/hooks/useFirebaseSync'
import { useCollabSync } from '@/hooks/useCollabSync'
import { useGoogleCalendarSync } from '@/apps/googleCalendar/useGoogleCalendarSync'
import { AppShell } from '@/components/layout/AppShell'
import { TabBar, SideBar } from '@/components/layout/TabBar'
import { Onboarding } from '@/components/layout/Onboarding'
import { NextSemesterDialog } from '@/components/layout/NextSemesterDialog'
import { PresetUpdateDialog } from '@/components/layout/PresetUpdateDialog'
import { TasksTab } from '@/components/tasks/TasksTab'
import { KanbanTab } from '@/components/kanban/KanbanTab'
import { GradesTab } from '@/components/grades/GradesTab'
import { CalendarTab } from '@/components/calendar/CalendarTab'
import { FocusTab } from '@/components/focus/FocusTab'
import { SettingsTab } from '@/components/settings/SettingsTab'
import { getAppTabs, getAppById } from '@/apps/registry'
import { StorageWarningModal } from '@/components/common/StorageWarningModal'
import { useTheme } from '@/hooks/useTheme'
import { useStandby } from '@/hooks/useStandby'
import { useAppBadge } from '@/hooks/useAppBadge'
import { useWidgetSync } from '@/hooks/useWidgetSync'
import { consumeLaunchTab } from '@/lib/widgets/bridge'
import { useHydrateState } from '@/hooks/useHydrateState'
import { StandbyOverlay } from '@/components/standby/StandbyOverlay'
import { GlobalTomatoLayer } from '@/components/pomodoro/GlobalTomatoLayer'
import { SpotlightOverlay } from '@/apps/quickAction/SpotlightOverlay'
import { cn } from '@/lib/utils'
import { getAppStorageBytes, getLoadWarnings } from '@/store/persist'
import { loadFirebaseConfig } from '@/lib/firebase'
import { useStrings } from '@/lib/strings'
import { matchesShortcut, defaultQuickActionShortcut } from '@/lib/shortcuts'

const STORAGE_LIMIT = 5 * 1024 * 1024
const TRIPLE_TAP_WINDOW_MS = 450
const SYNTHETIC_MOUSE_MS = 500

const CORE_TABS = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'notes', 'settings']

function enabledPluginTabIds(state) {
  return getAppTabs()
    .filter(pt => !CORE_TABS.includes(pt.id))
    .filter(pt => getAppById(pt.id)?.isEnabled(state))
    .map(pt => pt.id)
}

function hasNewerVersionWarning() {
  return getLoadWarnings().includes('newer-version')
    || sessionStorage.getItem('organizer:remote-newer') === '1'
}

function NewerVersionBanner() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [visible, setVisible] = useState(hasNewerVersionWarning)
  if (!visible) return null
  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 py-2 text-xs px-4-safe pt-2-safe">
      <span>{t.newerVersionWarning}</span>
      <button className="shrink-0 font-medium underline" onClick={() => setVisible(false)}>×</button>
    </div>
  )
}

function CollabErrorToast() {
  const lastError = useStore(s => s.collabRuntime?.lastError ?? null)
  const clearCollabError = useStore(s => s.clearCollabError)
  useEffect(() => {
    if (!lastError) return
    const id = setTimeout(() => clearCollabError(), 6000)
    return () => clearTimeout(id)
  }, [lastError, clearCollabError])
  if (!lastError) return null
  return (
    <div className="fixed bottom-above-tab-bar inset-x-0 z-50 flex justify-center px-4-safe">
      <div className="flex items-center gap-3 rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-xs shadow-lg max-w-sm">
        <span className="flex-1">{lastError.message}</span>
        <button className="shrink-0 font-medium" onClick={clearCollabError}>×</button>
      </div>
    </div>
  )
}

function SyncLockedBanner({ onOpenSettings }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  return (
    <div className="fixed bottom-above-tab-bar inset-x-0 z-50 flex justify-center px-4-safe">
      <button onClick={onOpenSettings}
        className="flex w-full max-w-sm items-center gap-3 rounded-lg bg-destructive px-4 py-2 text-left text-xs text-destructive-foreground shadow-lg">
        <span className="flex-1">{t.encRemoteAlreadyEncrypted}</span>
        <span className="shrink-0 font-medium underline">{t.encUnlockTitle}</span>
      </button>
    </div>
  )
}

const LAST_TAB_KEY = 'organizer:lastTab'

function readLastTab() {
  try {
    return sessionStorage.getItem(LAST_TAB_KEY)
  } catch {
    return null
  }
}

function writeLastTab(tab) {
  try {
    sessionStorage.setItem(LAST_TAB_KEY, tab)
  } catch {
    return
  }
}

function TabPanel({ id, activeTab, children }) {
  const isActive = id === activeTab
  return (
    <div aria-hidden={!isActive} className={cn(
      'transition-opacity duration-150 h-full w-full',
      isActive ? 'opacity-100' : 'pointer-events-none opacity-0 invisible absolute inset-0'
    )}>
      {children}
    </div>
  )
}

export default function App() {
  const hydrated = useHydrateState()
  useTheme()
  useCollabSync()
  useGoogleCalendarSync()
  useAppBadge()
  useWidgetSync()
  const standbyActive = useStandby()
  const onboardingDone = useStore(s => s.onboardingDone)
  const completeOnboarding = useStore(s => s.completeOnboarding)
  const pluginTabsKey = useStore(s => enabledPluginTabIds(s).join(','))
  const tabs = useMemo(
    () => [...CORE_TABS, ...(pluginTabsKey ? pluginTabsKey.split(',') : [])],
    [pluginTabsKey],
  )
  const [activeTab, setActiveTab] = useState(() => {
    const state = useStore.getState()
    const known = [...CORE_TABS, ...enabledPluginTabIds(state)]
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (known.includes(requested)) return requested
    const preferred = state.settings?.defaultTab ?? 'last'
    if (preferred !== 'last' && known.includes(preferred)) return preferred
    const remembered = readLastTab()
    return known.includes(remembered) ? remembered : 'tasks'
  })
  useEffect(() => {
    writeLastTab(activeTab)
  }, [activeTab])
  useEffect(() => {
    consumeLaunchTab().then(tab => {
      if (tab) useStore.getState().setActiveTab(tab)
    })
  }, [])
  const navbarMobilePosition = useStore(s => s.settings?.navbar?.mobilePosition ?? 'bottom')
  const requestedTab = useStore(s => s.activeTab)
  const clearRequestedTab = useStore(s => s.setActiveTab)
  if (requestedTab && tabs.includes(requestedTab)) {
    setActiveTab(requestedTab)
    clearRequestedTab(null)
  }
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showStorageWarning, setShowStorageWarning] = useState(false)
  const { status: syncStatus, pullIfStale } = useFirebaseSync()

  const quickActionAppEnabled = useStore(s => s.settings?.apps?.quickAction !== false)
  const quickActionShortcutRaw = useStore(s => s.settings?.apps?.quickActionShortcut)
  const quickActionShortcut = quickActionShortcutRaw === undefined ? defaultQuickActionShortcut() : quickActionShortcutRaw
  const [spotlightOpen, setSpotlightOpen] = useState(false)

  useEffect(() => {
    if (!quickActionAppEnabled) return
    const handleKeyDown = e => {
      if (matchesShortcut(e, quickActionShortcut)) {
        e.preventDefault()
        setSpotlightOpen(v => !v)
        return
      }
      if (e.key === 'Escape') {
        setSpotlightOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quickActionAppEnabled, quickActionShortcut])

  const quickActionTripleTap = useStore(s => s.settings?.apps?.quickActionTripleTap ?? false)

  useEffect(() => {
    if (!quickActionAppEnabled || !quickActionTripleTap) return
    let taps = []
    let lastTouch = 0

    const registerTap = (e) => {
      if (e.target.closest?.('button, input, textarea, a, select, [role="button"], [contenteditable]')) return
      const now = Date.now()
      taps = taps.filter(ts => now - ts < TRIPLE_TAP_WINDOW_MS)
      taps.push(now)
      if (taps.length >= 3) {
        taps = []
        setSpotlightOpen(v => !v)
      }
    }
    const handleTouchEnd = (e) => {
      lastTouch = Date.now()
      registerTap(e)
    }
    const handleMouseDown = (e) => {
      if (Date.now() - lastTouch < SYNTHETIC_MOUSE_MS) return
      registerTap(e)
    }

    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [quickActionAppEnabled, quickActionTripleTap])

  useEffect(() => {
    pullIfStale()
  }, [activeTab, pullIfStale])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (loadFirebaseConfig()) return
      const bytes = await getAppStorageBytes()
      if (!cancelled && bytes > STORAGE_LIMIT) setShowStorageWarning(true)
    }
    check()
    const id = setInterval(check, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!hydrated) return <AppShell><div className="min-h-dvh" /></AppShell>

  if (!onboardingDone) return <AppShell><Onboarding onDone={completeOnboarding} /></AppShell>

  if (standbyActive) return <AppShell><StandbyOverlay /></AppShell>

  const mobileSide = navbarMobilePosition === 'side'
  return (
    <AppShell>
      <div className="flex h-dvh overflow-hidden">
        <SideBar activeTab={activeTab} onTabChange={setActiveTab} open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} mobileSide={mobileSide} />
        <div className={cn('relative flex-1 overflow-hidden md:pb-0', mobileSide ? 'pb-0' : 'pb-tab-bar')}>
          {tabs.map(tab => {
            const pluginTab = getAppTabs().find(pt => pt.id === tab)
            const PluginComp = pluginTab?.component
            return (
              <TabPanel key={tab} id={tab} activeTab={activeTab}>
                {tab === 'tasks' && <TasksTab />}
                {tab === 'kanban' && <KanbanTab />}
                {tab === 'grades' && <GradesTab />}
                {tab === 'calendar' && <CalendarTab />}
                {tab === 'focus' && <FocusTab />}
                {tab === 'settings' && <SettingsTab syncStatus={syncStatus} />}
                {PluginComp && <PluginComp />}
              </TabPanel>
            )
          })}
        </div>
      </div>
      {!mobileSide && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}
      <GlobalTomatoLayer activeTab={activeTab} />
      <CollabErrorToast />
      {syncStatus === 'key-required' && activeTab !== 'settings' && (
        <SyncLockedBanner onOpenSettings={() => setActiveTab('settings')} />
      )}
      <NewerVersionBanner />
      <NextSemesterDialog />
      <PresetUpdateDialog />
      {showStorageWarning && <StorageWarningModal onDismiss={() => setShowStorageWarning(false)} />}
      <SpotlightOverlay open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
    </AppShell>
  )
}
