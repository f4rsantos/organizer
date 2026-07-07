import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { decodeStateFromUrl, clearUrlHash } from './lib/shareUtils'
import { saveState, forceSaveState } from './store/persist'
import { migrateState } from './store/migrations'
import { loadFirebaseConfig, pullFromFirebase } from './lib/firebase'
import { registerPwa } from './pwa/registerPwa'

const urlData = decodeStateFromUrl()
if (urlData) {
  const { state, status } = migrateState(urlData)
  if (status === 'ok' || status === 'migrated') saveState(state)
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
      const { state, status } = migrateState(remote)
      if (status === 'newer') sessionStorage.setItem('organizer:remote-newer', '1')
      else if (status !== 'invalid') forceSaveState(state)
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
