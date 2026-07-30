import { describe, it, expect } from 'vitest'
import {
  SHED_ORDER, predictSliceChars, predictContainerBytes, planWithinBudget,
} from './sliceBudget.js'
import { DATA_SLICES } from './sliceCodec.js'

const LIMIT = Math.floor(4.8 * 1024 * 1024)

function stateWith(overrides = {}) {
  const state = { version: 7, theme: 'system', lang: 'en', onboardingDone: true }
  for (const slice of DATA_SLICES) state[slice] = []
  state.settings = {}
  state.kanban = {}
  state.grades = {}
  state.taskAlertStates = {}
  return { ...state, ...overrides }
}

describe('size prediction', () => {
  it('reports zero for an absent slice', () => {
    expect(predictSliceChars(undefined)).toBe(0)
  })

  it('grows with the payload', () => {
    expect(predictSliceChars('x'.repeat(1000)))
      .toBeGreaterThan(predictSliceChars('x'.repeat(100)))
  })

  it('accounts for base64 inflation', () => {
    const plain = JSON.stringify('x'.repeat(3000)).length
    expect(predictSliceChars('x'.repeat(3000))).toBeGreaterThan(plain)
  })

  it('counts a small state well under the cap', () => {
    expect(predictContainerBytes(stateWith())).toBeLessThan(LIMIT)
  })

  it('counts a huge state over the cap', () => {
    expect(predictContainerBytes(stateWith({ tasks: ['x'.repeat(3_000_000)] })))
      .toBeGreaterThan(LIMIT)
  })

  it('ignores omitted slices when sizing', () => {
    const state = stateWith({ pomodoros: ['x'.repeat(3_000_000)] })
    expect(predictContainerBytes(state, ['pomodoros'])).toBeLessThan(LIMIT)
  })
})

describe('planning under budget', () => {
  it('sheds nothing when the state fits', () => {
    const state = stateWith()
    const plan = planWithinBudget(state, LIMIT)
    expect(plan.omitted).toEqual([])
    expect(plan.state).toBe(state)
  })

  it('sheds the lowest priority slice first', () => {
    const plan = planWithinBudget(stateWith({ pomodoros: ['x'.repeat(3_000_000)] }), LIMIT)
    expect(plan.omitted).toEqual(['pomodoros'])
  })

  it('keeps tasks when a cheaper slice can be shed', () => {
    const plan = planWithinBudget(
      stateWith({ taskAlertStates: { a: 'x'.repeat(3_000_000) }, tasks: [{ id: 't1' }] }),
      LIMIT,
    )
    expect(plan.omitted).not.toContain('tasks')
    expect(plan.omitted).toContain('taskAlertStates')
  })

  it('drops canvas notes rather than the whole notes slice', () => {
    const plan = planWithinBudget(stateWith({
      notes: [
        { id: 'n1', kind: 'canvas', strokes: 'x'.repeat(3_000_000) },
        { id: 'n2', kind: 'text' },
      ],
    }), LIMIT)

    expect(plan.omitted).not.toContain('notes')
    expect(plan.state.notes).toHaveLength(1)
    expect(plan.state.notes[0].id).toBe('n2')
  })

  it('does not mutate the input state', () => {
    const state = stateWith({ notes: [{ id: 'n1', kind: 'canvas', strokes: 'x'.repeat(3_000_000) }] })
    const before = state.notes.length
    planWithinBudget(state, LIMIT)
    expect(state.notes).toHaveLength(before)
  })

  it('sheds progressively until it fits', () => {
    const plan = planWithinBudget(stateWith({
      pomodoros: ['x'.repeat(2_000_000)],
      taskAlertStates: { a: 'x'.repeat(2_000_000) },
      grades: { g: 'x'.repeat(2_000_000) },
    }), LIMIT)

    expect(plan.omitted.length).toBeGreaterThan(1)
    expect(predictContainerBytes(plan.state, plan.omitted)).toBeLessThanOrEqual(LIMIT)
  })

  it('sheds tasks only as a last resort', () => {
    const plan = planWithinBudget(stateWith({ tasks: ['x'.repeat(6_000_000)] }), LIMIT)
    expect(plan.omitted).toContain('tasks')
  })

  it('follows the documented shed order', () => {
    expect(SHED_ORDER[0]).toBe('pomodoros')
    expect(SHED_ORDER[SHED_ORDER.length - 1]).toBe('tasks')
  })
})
