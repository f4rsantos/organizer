const SLOT_NAMES = ['low', 'medium', 'high']

function isSlotConfigured(slot) {
  return Boolean(slot?.provider) && Boolean(slot?.model)
}

export function resolveSlot(slots, requested) {
  const requestedSlot = slots?.[requested]
  if (isSlotConfigured(requestedSlot)) {
    return { slot: requestedSlot, resolvedFrom: requested }
  }

  if (requested === 'low' || requested === 'high') {
    const mediumSlot = slots?.medium
    if (isSlotConfigured(mediumSlot)) {
      return { slot: mediumSlot, resolvedFrom: 'medium' }
    }
  }

  return { slot: null, resolvedFrom: null }
}

export function validateSlots(slots) {
  const errors = []
  if (!isSlotConfigured(slots?.medium)) {
    errors.push({ slot: 'medium', reason: 'missing-required-slot' })
  }
  return { valid: errors.length === 0, errors }
}

export function listConfiguredSlots(slots) {
  return SLOT_NAMES.filter(name => isSlotConfigured(slots?.[name]))
}
