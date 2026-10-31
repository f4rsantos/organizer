import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLocalStorage, readStoredContainer, resetStateDb, flushPersist } from '../../helpers/testStorage.js'

let useStore
let classesPanelApp

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  await resetStateDb()
  ;({ useStore } = await import('../../../src/store/useStore.js'))
  ;({ classesPanelApp } = await import('../../../src/apps/classesPanel/index.js'))
  useStore.setState({ hydrated: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('classes panel lesson data', () => {
  it('stores a manually counted lesson with its study ticks', async () => {
    const key = useStore.getState().addManualLesson('c1', { date: '2026-10-12', type: 'TP' })
    useStore.getState().patchLessonSession('c1', key, { studied: { attend: true }, theme: 'Limits' })
    await flushPersist()

    expect((await readStoredContainer()).slices).toHaveProperty('lessons')
    expect(useStore.getState().lessons.c1.sessions[key]).toMatchObject({
      manual: true, date: '2026-10-12', type: 'TP', theme: 'Limits', studied: { attend: true },
    })
  })

  it('never stores the slice for a user who has not used the panel', async () => {
    useStore.getState().completeOnboarding()
    await flushPersist()

    expect((await readStoredContainer()).slices).not.toHaveProperty('lessons')
  })

  it('disabling the app removes the lesson data from storage', async () => {
    useStore.getState().addManualLesson('c1', { date: '2026-10-12', type: 'T' })
    await flushPersist()

    useStore.getState().disableApp(classesPanelApp.id, classesPanelApp.cleanup)
    await flushPersist()

    expect((await readStoredContainer()).slices).not.toHaveProperty('lessons')
  })
})
