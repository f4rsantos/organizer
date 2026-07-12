import { initializeApp, getApps, getApp } from 'firebase/app'
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
import { createInviteToken, hashToken } from './token'
import { createTeamState, isMember } from './schema'

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

export async function createTeam({ config, hostUserId, name, expiresAt }) {
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
    state: createTeamState(),
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

export async function deleteTeam({ config, teamId }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await deleteDoc(teamRef(db, teamId))
}

export async function generateInvite({ config, teamId, ttlMs }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  const token = createInviteToken()
  const tokenHash = await hashToken(token)
  const expiresAt = Date.now() + ttlMs
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    tx.update(ref, {
      invite: {
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
  const tokenHash = await hashToken(token)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    const invite = team?.invite
    if (!invite?.tokenHash || invite.tokenHash !== tokenHash) throw new Error('Invalid invite')
    if (Date.now() > (invite.expiresAt ?? 0)) throw new Error('Invite expired')
    const members = team.members ?? {}
    if (!members[userId]) {
      members[userId] = { role: 'member', joinedAt: Date.now() }
    }
    tx.update(ref, {
      members,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
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

export function subscribeTeam({ config, teamId, onData, onError }) {
  const { auth, db } = getOrCreateApp(config)
  ensureSignedIn(auth).catch(onError)
  return onSnapshot(teamRef(db, teamId), snap => {
    onData(snap.exists() ? snap.data() : null)
  }, onError)
}

export async function fetchTeam({ config, teamId }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  const snap = await getDoc(teamRef(db, teamId))
  return snap.exists() ? snap.data() : null
}

export async function updateTeamState({ config, teamId, userId, updater }) {
  const { auth, db } = getOrCreateApp(config)
  await ensureSignedIn(auth)
  await runTransaction(db, async tx => {
    const ref = teamRef(db, teamId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Team not found')
    const team = snap.data()
    if (!isMember(team, userId)) throw new Error('Not a member')
    const nextState = updater(team.state ?? createTeamState(), team)
    tx.update(ref, {
      state: nextState,
      updatedAt: Date.now(),
      serverUpdatedAt: serverTimestamp(),
    })
  })
}
