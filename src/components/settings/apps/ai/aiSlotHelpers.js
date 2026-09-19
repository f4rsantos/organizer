export const SLOT_ORDER = ['low', 'medium', 'high']

export const AI_PREFERENCES_DEBOUNCE_MS = 500

export const ERROR_KIND_STRING_KEYS = {
  auth: 'aiErrorAuth',
  rateLimit: 'aiErrorRateLimit',
  noSuchModel: 'aiErrorNoSuchModel',
  noToolSupport: 'aiErrorNoToolSupport',
  network: 'aiErrorNetwork',
  unknown: 'aiErrorUnknown',
}

export function errorKindStringKey(kind) {
  return ERROR_KIND_STRING_KEYS[kind] ?? ERROR_KIND_STRING_KEYS.unknown
}

export function shouldWarnMissingToolSupport(slotName) {
  return slotName === 'medium' || slotName === 'high'
}

export function isSlotFilled(slot) {
  return Boolean(slot?.provider) && Boolean(slot?.model?.trim())
}

export function localhostHintKey(baseUrl, isNativeBuild) {
  const trimmed = (baseUrl ?? '').trim()
  if (!trimmed) return null
  let hostname
  try {
    hostname = new URL(trimmed).hostname
  } catch {
    return null
  }
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1'
  if (!isLoopback) return null
  return isNativeBuild ? 'aiLocalhostHintNative' : 'aiLocalhostHintWeb'
}

export function slotsFromSettings(settingsAi) {
  return settingsAi?.slots ?? {}
}

export function withSlotPatch(settingsAi, slotName, patch) {
  const slots = slotsFromSettings(settingsAi)
  const current = slots[slotName] ?? {}
  const next = { ...current, ...patch }
  return {
    ...settingsAi,
    slots: { ...slots, [slotName]: next },
  }
}

export function withSlotCleared(settingsAi, slotName) {
  const slots = slotsFromSettings(settingsAi)
  const nextSlots = { ...slots }
  delete nextSlots[slotName]
  return { ...settingsAi, slots: nextSlots }
}
