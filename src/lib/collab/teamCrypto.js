import {
  encryptWithKey, decryptWithKey, isEnvelope, generateRawKeyString, validateKeyString,
  importRawKey, aadForTeamSlice,
} from '../crypto'
import { createTeamState } from './schema'

export const TEAM_FORMAT = 'green-apricot'
const TEAM_FORMATS = [TEAM_FORMAT, 'organizer-team-sliced-1']
export const TEAM_SLICES = ['tasks', 'kanban']

export function createTeamKey() {
  return generateRawKeyString()
}

export function isValidTeamKey(key) {
  return validateKeyString(key)
}

export function isTeamContainer(value) {
  return Boolean(value && typeof value === 'object' && TEAM_FORMATS.includes(value.format))
}

export function isEncryptedTeamState(state) {
  if (isTeamContainer(state)) return Object.values(state.slices ?? {}).some(isEnvelope)
  return isEnvelope(state)
}

export async function encryptTeamState(state, teamKey, teamId) {
  if (!teamKey) {
    return { format: TEAM_FORMAT, encrypted: false, slices: buildPlainSlices(state) }
  }

  const key = await importRawKey(teamKey)
  const slices = {}
  for (const slice of TEAM_SLICES) {
    slices[slice] = state?.[slice] === undefined
      ? null
      : await encryptWithKey(key, state[slice], aadForTeamSlice(teamId ?? '', slice))
  }

  return { format: TEAM_FORMAT, encrypted: true, slices }
}

function buildPlainSlices(state) {
  const slices = {}
  for (const slice of TEAM_SLICES) {
    slices[slice] = state?.[slice] === undefined ? null : { plain: state[slice] }
  }
  return slices
}

export async function decryptTeamState(payload, teamKey, teamId) {
  if (payload === null || payload === undefined) return null

  if (isTeamContainer(payload)) {
    return decodeTeamContainer(payload, teamKey, teamId)
  }

  if (!isEnvelope(payload)) return payload
  if (!teamKey) return null
  try {
    return await decryptWithKey(
      await importRawKey(teamKey), payload, aadForTeamSlice(teamId ?? '', 'tasks'),
    )
  } catch {
    return null
  }
}

async function decodeTeamContainer(container, teamKey, teamId) {
  const state = {}
  let key = null

  for (const [slice, stored] of Object.entries(container.slices ?? {})) {
    if (stored === null || stored === undefined) continue

    if (isEnvelope(stored)) {
      if (!teamKey) return null
      try {
        key = key ?? await importRawKey(teamKey)
        state[slice] = await decryptWithKey(key, stored, aadForTeamSlice(teamId ?? '', slice))
      } catch {
        return null
      }
      continue
    }

    if (Object.hasOwn(stored, 'plain')) state[slice] = stored.plain
  }

  return state
}

export async function decryptTeamDoc(team, teamKey) {
  if (!team) return null
  const state = await decryptTeamState(team.state, teamKey, team.id)
  if (state === null && isEncryptedTeamState(team.state)) {
    return { ...team, state: null, locked: true }
  }
  return { ...team, state: state ?? createTeamState(), locked: false }
}
