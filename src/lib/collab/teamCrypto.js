import {
  encryptForSlot, decryptForSlot, isEnvelope, generateRawKeyString, validateKeyString,
  aadForTeamSlice, WHOLE_STATE,
} from '../crypto'
import { createTeamState } from './schema'

function teamAad(teamId) {
  return aadForTeamSlice(teamId ?? '', WHOLE_STATE)
}

export function createTeamKey() {
  return generateRawKeyString()
}

export function isValidTeamKey(key) {
  return validateKeyString(key)
}

export async function encryptTeamState(state, teamKey, teamId) {
  if (!teamKey) return state
  return encryptForSlot(state, teamKey, teamAad(teamId))
}

export async function decryptTeamState(payload, teamKey, teamId) {
  if (!isEnvelope(payload)) return payload ?? null
  if (!teamKey) return null
  try {
    return await decryptForSlot(payload, teamKey, teamAad(teamId))
  } catch {
    return null
  }
}

export async function decryptTeamDoc(team, teamKey) {
  if (!team) return null
  const state = await decryptTeamState(team.state, teamKey, team.id)
  if (state === null && isEnvelope(team.state)) return { ...team, state: null, locked: true }
  return { ...team, state: state ?? createTeamState(), locked: false }
}
