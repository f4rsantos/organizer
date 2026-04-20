import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useFirebaseSync } from '@/hooks/useFirebaseSync'
import { useCollabSync } from '@/hooks/useCollabSync'
import { AppShell } from '@/components/layout/AppShell'
import { TabBar, SideBar } from '@/components/layout/TabBar'
import { Onboarding } from '@/components/layout/Onboarding'
import { NextSemesterDialog } from '@/components/layout/NextSemesterDialog'
import { TasksTab } from '@/components/tasks/TasksTab'
import { KanbanTab } from '@/components/kanban/KanbanTab'
import { GradesTab } from '@/components/grades/GradesTab'
import { CalendarTab } from '@/components/calendar/CalendarTab'
import { FocusTab } from '@/components/focus/FocusTab'
import { SettingsTab } from '@/components/settings/SettingsTab'
import { StorageWarningModal } from '@/components/common/StorageWarningModal'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { getAppStorageBytes } from '@/store/persist'
import { loadFirebaseConfig } from '@/lib/firebase'

const STORAGE_LIMIT = 5 * 1024 * 1024

const TABS = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings']

function TabPanel({ id, activeTab, children }) {
  const isActive = id === activeTab
  return (
    <div className={cn(
      'transition-opacity duration-150 h-full w-full',
      isActive ? 'opacity-100' : 'pointer-events-none opacity-0 absolute inset-0'
    )}>
      {children}
    </div>
  )
}

export default function App() {
  useTheme()
  useCollabSync()
  const onboardingDone = useStore(s => s.onboardingDone)
  const completeOnboarding = useStore(s => s.completeOnboarding)
  const [activeTab, setActiveTab] = useState('tasks')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showStorageWarning, setShowStorageWarning] = useState(false)
  const { status: syncStatus, pullNow } = useFirebaseSync()

  useEffect(() => {
    pullNow()
  }, [activeTab, pullNow])

  useEffect(() => {
    const check = () => {
      if (getAppStorageBytes() > STORAGE_LIMIT && !loadFirebaseConfig()) {
        setShowStorageWarning(true)
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  if (!onboardingDone) return <AppShell><Onboarding onDone={completeOnboarding} /></AppShell>

  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden">
        <SideBar activeTab={activeTab} onTabChange={setActiveTab} open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <div className="relative flex-1 overflow-hidden pb-20 md:pb-0">
          {TABS.map(tab => (
            <TabPanel key={tab} id={tab} activeTab={activeTab}>
              {tab === 'tasks' && <TasksTab />}
              {tab === 'kanban' && <KanbanTab />}
              {tab === 'grades' && <GradesTab />}
              {tab === 'calendar' && <CalendarTab />}
              {tab === 'focus' && <FocusTab />}
              {tab === 'settings' && <SettingsTab syncStatus={syncStatus} />}
            </TabPanel>
          ))}
        </div>
      </div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <NextSemesterDialog />
      {showStorageWarning && <StorageWarningModal onDismiss={() => setShowStorageWarning(false)} />}
    </AppShell>
  )
}
