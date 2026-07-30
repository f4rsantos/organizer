import { useState } from 'react'
import { isValidMnemonic, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE } from '@/lib/crypto'

export function useSecretUnlock({ onUnlock, t }) {
  const [slot, setSlot] = useState(SLOT_PASSPHRASE)
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const usingRecoveryCode = slot === SLOT_RECOVERY_CODE

  const switchSlot = () => {
    setSlot(usingRecoveryCode ? SLOT_PASSPHRASE : SLOT_RECOVERY_CODE)
    setValue('')
    setError(null)
  }

  const update = next => {
    setValue(next)
    setError(null)
  }

  const submit = async () => {
    if (!value.trim()) return
    if (usingRecoveryCode && !(await isValidMnemonic(value))) {
      setError(t.encRecoveryCodeInvalid)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onUnlock({ slot, secret: value })
    } catch (err) {
      setError(err?.message === 'dek-id-mismatch' ? t.encRemoteDekMismatch : t.encUnlockFailed)
    } finally {
      setBusy(false)
    }
  }

  return { slot, usingRecoveryCode, value, error, busy, switchSlot, update, submit, setError }
}
