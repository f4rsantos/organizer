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
import { createInviteToken, createTokenSalt, hashToken, matchesTokenHash } from './token'
import { createTeamState, isMember } from './schema'
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

function teamRef(db, teamId) {
  return doc(db, 'teams', teamId)
}

export async function createTeam({ config, hostUserId, name, expiresAt, teamKey }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  const teamId = nanoid()
  await setDoc(teamRef(db, teamId), {
    id: teamId,
    name,
    hostUserId,
    membersCanEditShared: true,
    sharedTaskCompletionMode: 'for-all',
    expiresAt,
    members: {
      [hostUserId]: {
        role: 'host',
        joinedAt: Date.now(),
      },
    },
    invite: null,
    state: await encryptTeamState(createTeamState(), teamKey, teamId),
    updatedAt: Date.now(),
    serverUpdatedAt: serverTimestamp(),
  })
  return teamId
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

export async function updateMemberAlias({ config, teamId, userId, alias }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const team = snap.data()
    const members = { ...(team.members ?? {}) }
    if (!members[userId]) return
    members[userId] = { ...members[userId], alias: alias ?? '' }
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

export async function joinWithInvite({ config, teamId, token, userId }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
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
    const members = team.members ?? {}
    if (!members[userId]) {
      members[userId] = { role: 'member', joinedAt: Date.now(), alias: '' }
    }
    tx.update(ref, {
      members,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
  return { teamName }
}

export async function leaveTeam({ config, teamId, userId }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const team = snap.data()
    const members = { ...(team.members ?? {}) }
    delete members[userId]
    tx.update(ref, {
      members,
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

export async function updateTeamState({ config, teamId, userId, teamKey, updater }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    if (!isMember(team, userId)) throw new Error('Not a member')

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
