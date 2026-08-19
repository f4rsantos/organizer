import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { nanoid } from '@/lib/ids'
import { createInviteToken, createTokenSalt, hashToken, matchesTokenHash, createKeyProof, matchesKeyProof } from './token'
import { createTeamState, isMember, personForAuthUid } from './schema'
import { encryptTeamState, decryptTeamState, decryptTeamDoc, isEncryptedTeamState } from './teamCrypto'

const appCache = new Map()

function appName(projectId) {
  return `collab_${projectId}`
}

function getOrCreateApp(config) {
  const name = appName(config.projectId)
  if (appCache.has(name)) return appCache.get(name)
  const existing = getApps().find(app => app.name === name)
  const app = existing ?? initializeApp({ apiKey: config.apiKey, projectId: config.projectId }, name)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const bundle = { app, auth, db }
  appCache.set(name, bundle)
  return bundle
}

async function ensureSignedIn(auth) {
  if (auth.currentUser) return auth.currentUser
  const { user } = await signInAnonymously(auth)
  return user
}

export async function resolveDeviceAuthUid(config) {
  const { auth } = getOrCreateApp(config)
  const { uid } = await ensureSignedIn(auth)
  return uid
}

function teamRef(db, teamId) {
  return doc(db, 'teams', teamId)
}

export async function createTeam({ config, name, expiresAt, teamKey, personId }) {
  if (!personId) throw new Error('Missing identity')
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  const teamId = nanoid()
  const keyProofSalt = createTokenSalt()
  await setDoc(teamRef(db, teamId), {
    id: teamId,
    name,
    hostPersonId: personId,
    membersCanEditShared: true,
    sharedTaskCompletionMode: 'for-all',
    expiresAt,
    members: {
      [personId]: {
        role: 'host',
        joinedAt: Date.now(),
        alias: '',
      },
    },
    authUids: { [authUid]: personId },
    keyProofSalt,
    keyProofHash: await createKeyProof(teamKey, keyProofSalt),
    invite: null,
    state: await encryptTeamState(createTeamState(), teamKey, teamId),
    updatedAt: Date.now(),
    serverUpdatedAt: serverTimestamp(),
  })
  return { teamId, userId: personId }
}

export async function updateTeamMeta({ config, teamId, updates }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    tx.update(ref, {
      ...updates,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function updateMemberAlias({ config, teamId, alias }) {
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const team = snap.data()
    const personId = personForAuthUid(team, authUid)
    const members = { ...(team.members ?? {}) }
    if (!personId || !members[personId]) return
    members[personId] = { ...members[personId], alias: alias ?? '' }
    tx.update(ref, {
      members,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export async function deleteTeam({ config, teamId }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await deleteDoc(teamRef(db, teamId))
}

export async function generateInvite({ config, teamId, ttlMs }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  const token = createInviteToken()
  const tokenSalt = createTokenSalt()
  const tokenHash = await hashToken(token, tokenSalt)
  const expiresAt = Date.now() + ttlMs
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    tx.update(ref, {
      invite: {
        tokenSalt,
        tokenHash,
        expiresAt,
      },
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
  return { token, expiresAt }
}

export async function joinWithInvite({ config, teamId, token, personId }) {
  if (!personId) throw new Error('Missing identity')
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  let teamName = null
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    teamName = typeof team.name === 'string' ? team.name : null
    const invite = team?.invite
    const valid = await matchesTokenHash({
      token, salt: invite?.tokenSalt, tokenHash: invite?.tokenHash,
    })
    if (!valid) throw new Error('Invalid invite')
    if (Date.now() > (invite.expiresAt ?? 0)) throw new Error('Invite expired')
    const members = { ...(team.members ?? {}) }
    if (!members[personId]) {
      members[personId] = { role: 'member', joinedAt: Date.now(), alias: '' }
    }
    tx.update(ref, {
      members,
      authUids: { ...(team.authUids ?? {}), [authUid]: personId },
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
  return { teamName, userId: personId }
}

export async function attachDeviceWithKey({ config, teamId, teamKey, personId }) {
  if (!personId || !teamKey) return { attached: false }
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  let attached = false
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    if (team.authUids?.[authUid]) return
    if (!team.members?.[personId]) return
    const valid = await matchesKeyProof({
      teamKey, salt: team.keyProofSalt, proofHash: team.keyProofHash,
    })
    if (!valid) return
    tx.update(ref, {
      authUids: { ...(team.authUids ?? {}), [authUid]: personId },
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
    attached = true
  })
  return { attached }
}

export async function leaveTeam({ config, teamId }) {
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const team = snap.data()
    const personId = personForAuthUid(team, authUid)
    if (!personId) return
    const members = { ...(team.members ?? {}) }
    delete members[personId]
    const authUids = Object.fromEntries(
      Object.entries(team.authUids ?? {}).filter(([, person]) => person !== personId)
    )
    tx.update(ref, {
      members,
      authUids,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}

export function subscribeTeam({ config, teamId, teamKey, onData, onError }) {
  const { auth, db } = getOrCreateApp(config)
  let unsub = null
  let cancelled = false

  ensureSignedIn(auth)
    .then(() => {
      if (cancelled) return
      unsub = onSnapshot(
        teamRef(db, teamId),
        snap => {
          if (!snap.exists()) {
            onData(null)
            return
          }
          decryptTeamDoc(snap.data(), teamKey).then(onData, onError)
        },
        onError,
      )
    })
    .catch(onError)

  return () => {
    cancelled = true
    if (unsub) unsub()
  }
}

export async function fetchTeam({ config, teamId, teamKey }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  const snap = await getDoc(teamRef(db, teamId))
  if (!snap.exists()) return null
  return decryptTeamDoc(snap.data(), teamKey)
}

export async function updateTeamState({ config, teamId, teamKey, updater }) {
  const { auth, db } = getOrCreateApp(config)
  const { uid: authUid } = await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    if (!isMember(team, personForAuthUid(team, authUid))) throw new Error('Not a member')

    const current = await decryptTeamState(team.state, teamKey, teamId)
    // Writing on an unreadable payload would clobber the team with a fresh
    // state, so a key mismatch has to abort the whole transaction.
    if (current === null && team.state) throw new Error('team-key-required')

    // The document decides its own format: encrypting a team that other members
    // joined while it was plaintext would lock every one of them out.
    const teamIsEncrypted = isEncryptedTeamState(team.state)
    const writeKey = teamIsEncrypted ? teamKey : null

    const nextState = updater(current ?? createTeamState(), team)
    tx.update(ref, {
      state: await encryptTeamState(nextState, writeKey, teamId),
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}
