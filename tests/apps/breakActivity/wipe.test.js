import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLocalStorage, readStoredContainer, resetStateDb, flushPersist } from '../../helpers/testStorage.js'
import { generateSudoku } from '../../../src/lib/breakActivity/sudoku.js'

let useStore
let breakActivityApp

beforeEach(async () => {
  vi.stubGlobal('localStorage', createLocalStorage())
  vi.resetModules()
  await resetStateDb()
  ;({ useStore } = await import('../../../src/store/useStore.js'))
  ;({ breakActivityApp } = await import('../../../src/apps/breakActivity/index.js'))
  useStore.setState({ hydrated: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('disabling the break app', () => {
  it('removes the sudoku slice from the stored container', async () => {
    useStore.getState().setBreakSudoku(generateSudoku({ difficulty: 'easy' }))
    await flushPersist()
    expect((await readStoredContainer()).slices).toHaveProperty('breakSudoku')

    useStore.getState().wipeAppData(breakActivityApp.wipe)
    await flushPersist()

    expect((await readStoredContainer()).slices).not.toHaveProperty('breakSudoku')
  })

  it('never stores the slice for a user who has not played', async () => {
    useStore.getState().completeOnboarding()
    await flushPersist()

    expect((await readStoredContainer()).slices).not.toHaveProperty('breakSudoku')
  })
})
