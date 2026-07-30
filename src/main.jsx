import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { registerPwa } from './pwa/registerPwa'
import { runBootstrap, resumeBootstrap } from './boot/bootstrap'
import { readContainerMeta } from './store/persist'

function rootElement() {
  return document.getElementById('root')
}

function renderApp(App) {
  createRoot(rootElement()).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

async function renderUnlockGate({ storeError }) {
  const [{ UnlockGate }, { loadPersonalWraps, unlockPersonal }] = await Promise.all([
    import('./components/crypto/UnlockGate.jsx'),
    import('./boot/unlockFlow'),
  ])

  const meta = readContainerMeta()
  const wraps = await loadPersonalWraps()
  if (!wraps) return

  return new Promise(resolve => {
    const root = createRoot(rootElement())
    const handleUnlock = async ({ slot, secret }) => {
      await unlockPersonal({ wraps, slot, secret })
      root.unmount()
      resolve()
    }

    root.render(
      <StrictMode>
        <UnlockGate
          lang={meta?.lang ?? 'en'}
          hint={wraps?.hint ?? null}
          storeError={storeError}
          onUnlock={handleUnlock}
        />
      </StrictMode>,
    )
  })
}

async function start() {
  const boot = await runBootstrap()

  if (boot.needsUnlock) {
    await renderUnlockGate(boot)
    await resumeBootstrap()
  }

  registerPwa()

  const { default: App } = await import('./App.jsx')
  renderApp(App)
}

void start()
