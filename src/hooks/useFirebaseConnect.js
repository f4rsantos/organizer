import { useState } from 'react'
import { saveFirebaseConfig, validateFirebaseConfig } from '@/lib/firebase'
import { parseFirebaseConfig } from '@/lib/firebaseConfig'
import { describeFirebaseError } from '@/lib/firebaseErrors'

export function useFirebaseConnect({ t, onConnected }) {
  const [raw, setRawValue] = useState('')
  const [error, setError] = useState(null)
  const [testing, setTesting] = useState(false)
  const [pending, setPending] = useState(null)

  const connect = config => {
    saveFirebaseConfig(config)
    onConnected(config)
  }

  const setRaw = value => {
    setRawValue(value)
    setError(null)
  }

  const submit = async () => {
    setError(null)
    const parsed = parseFirebaseConfig(raw)
    if (!parsed) { setError(t.firebaseConfigInvalid); return }
    setTesting(true)
    try {
      const remote = await validateFirebaseConfig(parsed)
      if (remote.encrypted && !remote.hasWraps) { setError(t.encRemoteUnrecoverable); return }
      if (remote.encrypted) { setPending({ config: parsed, remote }); return }
      connect(parsed)
    } catch (err) {
      setError(describeFirebaseError(err, t))
    } finally {
      setTesting(false)
    }
  }

  const completePending = () => {
    const { config } = pending
    setPending(null)
    connect(config)
  }

  const reset = () => {
    setRawValue('')
    setError(null)
    setPending(null)
  }

  return { raw, setRaw, error, testing, pending, submit, completePending, cancelPending: () => setPending(null), reset }
}
