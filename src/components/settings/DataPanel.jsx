import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { exportState, importState } from '@/store/persist'
import { exportEncryptedState, exportPlaintextState } from '@/lib/backupFiles'
import { loadFirebaseConfig } from '@/lib/firebase'
import { getEncMode, isEncryptionEnabled, loadKeyString, MODE_OFF } from '@/lib/crypto'
import { FirebaseGuideModal } from './FirebaseSyncPanel'
import { EncryptionModal } from '@/components/crypto/EncryptionSettings'
import { SettingLink, SettingList } from './SettingRow'

function ExportChoices({ t, onEncrypted, onReadable }) {
  return (
    <div className="flex gap-2 pb-3">
      <button type="button" onClick={onEncrypted}
        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-secondary/60">
        {t.exportEncrypted}
      </button>
      <button type="button" onClick={onReadable}
        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-secondary/60">
        {t.exportPlaintext}
      </button>
    </div>
  )
}

export function DataPanel({ syncStatus }) {
  const state = useStore(s => s)
  const importData = useStore(s => s.importData)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const fileRef = useRef(null)
  const [importError, setImportError] = useState(null)
  const [choosingExport, setChoosingExport] = useState(false)
  const [modal, setModal] = useState(null)
  const syncConnected = Boolean(loadFirebaseConfig())
  const encrypted = getEncMode() !== MODE_OFF

  const exportEncrypted = async () => {
    setChoosingExport(false)
    const keyString = loadKeyString()
    if (keyString) await exportEncryptedState(state, keyString)
  }

  const exportReadable = () => {
    setChoosingExport(false)
    exportPlaintextState(state)
  }

  const handleExport = () => {
    if (isEncryptionEnabled()) { setChoosingExport(v => !v); return }
    exportState(state)
  }

  const handleImport = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setImportError(null)
      importData(await importState(file), { preferLocalSettings: false })
    } catch (err) {
      setImportError(err?.message === 'encryption-key-required' ? t.firebaseKeyRequiredForImport : t.obFileInvalid)
    }
  }

  const syncValue = syncStatus === 'syncing' ? t.firebaseSyncing : syncConnected ? t.firebaseConnected : t.settingDisabled

  return (
    <SettingList>
      <SettingLink label={t.firebaseSync} desc={t.dataSyncDesc} value={syncValue} onClick={() => setModal('sync')} />
      <SettingLink label={t.encTitle} desc={t.dataEncryptionDesc}
        value={encrypted ? t.settingEnabled : t.settingDisabled} onClick={() => setModal('encryption')} />
      <div>
        <SettingLink label={t.exportJson} desc={t.dataExportDesc} icon={Download} onClick={handleExport} />
        {choosingExport && <ExportChoices t={t} onEncrypted={exportEncrypted} onReadable={exportReadable} />}
      </div>
      <div>
        <SettingLink label={t.importJson} desc={t.dataImportDesc} icon={Upload} onClick={() => fileRef.current?.click()} />
        {importError && <p className="pb-3 text-xs text-destructive">{importError}</p>}
      </div>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      {modal === 'sync' && <FirebaseGuideModal onClose={() => setModal(null)} syncStatus={syncStatus} />}
      {modal === 'encryption' && <EncryptionModal onClose={() => setModal(null)} />}
    </SettingList>
  )
}
