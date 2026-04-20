import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { decodeStateFromUrl, clearUrlHash } from './lib/shareUtils'
import { saveState, forceSaveState } from './store/persist'
import { loadFirebaseConfig, pullFromFirebase } from './lib/firebase'
import { registerPwa } from './pwa/registerPwa'

const urlData = decodeStateFromUrl()
if (urlData) {
  saveState(urlData)
  clearUrlHash()
}

async function hydrateLocalFromFirebaseBeforeRender() {
  const config = loadFirebaseConfig()
  if (!config) return

  try {
    const remote = await Promise.race([
      pullFromFirebase(config),
      new Promise(resolve => setTimeout(() => resolve(null), 6000)),
    ])

    if (remote?.version) {
      // Keep local storage aligned with cloud before Zustand initializes,
      // so the UI doesn't briefly render stale local data.
      forceSaveState(remote)
    }
  } catch {
  }
}

async function start() {
  await hydrateLocalFromFirebaseBeforeRender()

  registerPwa()

  const { default: App } = await import('./App.jsx')

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
