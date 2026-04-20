import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Upload } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { exportState, importState } from '@/store/persist'

export function ImportExportPanel() {
  const [error, setError] = useState(null)
  const fileRef = useRef()
  const state = useStore(s => s)
  const importData = useStore(s => s.importData)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const handleExport = () => {
    const { ...data } = state
    exportState(data)
  }

  const handleImport = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setError(null)
      const data = await importState(file)
      importData(data)
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> {t.exportJson}
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> {t.importJson}
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
