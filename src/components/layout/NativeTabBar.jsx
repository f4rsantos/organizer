import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useNavTabs, ADD_ID } from './useNavTabs'
import { useWebOverlayOpen } from '@/hooks/useWebOverlayOpen'
import { buildNativeTabBarSpec } from '@/lib/nativeTabBar'
import { addPickerActionIds } from '@/lib/navAddActions'
import { showNativeTabBar, hideNativeTabBar, onNativeTabSelected } from '@/lib/nativeChrome'

export function NativeTabBar({ activeTab, onTabChange, placement }) {
  const { items, labelMode } = useNavTabs()
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const theme = useStore(s => s.theme ?? 'system')
  const tint = useStore(s => s.settings?.themeFontColor ?? null)
  const addAction = useStore(s => s.settings?.navbar?.addAction ?? 'task')
  const notesEnabled = useStore(s => s.settings?.apps?.notes === true)
  const quickActionEnabled = useStore(s => s.settings?.apps?.quickAction !== false)
  const overlayOpen = useWebOverlayOpen(true)
  const onTabChangeRef = useRef(onTabChange)

  useEffect(() => {
    onTabChangeRef.current = onTabChange
  }, [onTabChange])

  const payload = JSON.stringify(buildNativeTabBarSpec({
    items,
    activeTab,
    labelMode,
    placement,
    theme,
    tint,
    addAction,
    addActionIds: addPickerActionIds({ notesEnabled, quickActionEnabled }),
    t,
    visible: !overlayOpen,
  }))

  useEffect(() => {
    showNativeTabBar(JSON.parse(payload))
  }, [payload])

  useEffect(() => () => { hideNativeTabBar() }, [])

  useEffect(() => onNativeTabSelected(({ id }) => {
    if (id !== ADD_ID) onTabChangeRef.current(id)
  }), [])

  return null
}
