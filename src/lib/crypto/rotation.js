import { zeroFill, randomBytes } from './bytes'
import { importDekFromRaw, computeDekId } from './keyStore'
import { createWraps, unwrapDekRaw } from './wraps'
import { encodeSlices, decodeSlices } from './sliceCodec'

const DEK_BYTES = 32

export async function rotateDek({
  container, wraps, currentSlot, currentSecret, passphrase, aadFor, rev,
}) {
  const currentRaw = await unwrapDekRaw(wraps, currentSlot, currentSecret)
  const nextRaw = randomBytes(DEK_BYTES)

  try {
    const currentDek = await importDekFromRaw(currentRaw)
    const state = await decodeSlices({ container, key: currentDek, aadFor })

    const created = await createWraps({ passphrase, hint: wraps?.hint, raw: nextRaw })
    const nextContainer = await encodeSlices({
      state,
      key: created.dek,
      aadFor,
      rev: rev ?? (container?.rev ?? 0) + 1,
    })

    return {
      container: nextContainer,
      wraps: created.wraps,
      recoveryCode: created.recoveryCode,
      dek: created.dek,
      dekId: created.dekId,
      previousDekId: await computeDekId(currentRaw),
    }
  } finally {
    zeroFill(currentRaw)
    zeroFill(nextRaw)
  }
}

export async function rotateAndPublish({
  container, wraps, currentSlot, currentSecret, passphrase, aadFor, publish, commit,
}) {
  const rotated = await rotateDek({
    container, wraps, currentSlot, currentSecret, passphrase, aadFor,
  })

  await publish({
    container: rotated.container,
    wraps: rotated.wraps,
    dekId: rotated.dekId,
  })

  await commit(rotated.dek)

  return { recoveryCode: rotated.recoveryCode, dekId: rotated.dekId, wraps: rotated.wraps }
}
