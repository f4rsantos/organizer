import { describe, it, expect } from 'vitest'
import { planPomodoroRecovery } from '../../../src/lib/focus/pomodoroRecovery.js'

const FALLBACK = 1500

function sequentialIds() {
  let n = 0
  return () => `rec-${++n}`
}

const options = () => ({ makeId: sequentialIds(), random: () => 0 })

const done = (id, focusSecs, createdAt) => ({ id, abandoned: false, focusSecs, createdAt })
const partial = (id, focusSecs, createdAt) => ({ id, abandoned: true, focusSecs, createdAt })

function secsOf(entries) {
  return entries.reduce((sum, p) => sum + p.focusSecs, 0)
}

describe('planPomodoroRecovery', () => {
  it('compares the tomatoes you have with the ones your focus time is worth', () => {
    const entries = [done('a', 1200, 1), done('b', 1800, 2), partial('c', 900, 3), partial('d', 900, 4)]
    const { summary } = planPomodoroRecovery(entries, FALLBACK, options())
    expect(summary).toMatchObject({
      have: 2,
      shouldHave: 3,
      averageSecs: 1500,
      spentSecs: 4800,
      tomatoSecs: 3000,
      missingSecs: 1800,
      addedCount: 1,
    })
  })

  it('turns abandoned partials into tomatoes of the average size without changing the total time', () => {
    const entries = [done('a', 1200, 1), done('b', 1800, 2), partial('c', 900, 3), partial('d', 900, 4)]
    const { entries: recovered } = planPomodoroRecovery(entries, FALLBACK, options())
    const completed = recovered.filter(p => !p.abandoned)
    expect(completed).toHaveLength(3)
    expect(completed[2]).toMatchObject({ focusSecs: 1500, createdAt: 4, recovered: true })
    expect(recovered.filter(p => p.abandoned).map(p => p.focusSecs)).toEqual([300])
    expect(secsOf(recovered)).toBe(4800)
  })

  it('never grows the count or time when run again', () => {
    const entries = [done('a', 1500, 1), partial('b', 2000, 2), partial('c', 2000, 3)]
    const first = planPomodoroRecovery(entries, FALLBACK, options())
    const second = planPomodoroRecovery(first.entries, FALLBACK, options())
    expect(second.summary.addedCount).toBe(0)
    expect(second.entries).toBe(first.entries)
    expect(second.summary.spentSecs).toBe(first.summary.spentSecs)
  })

  it('does not touch completed tomatoes of any size', () => {
    const entries = [done('a', 3600, 1), done('b', 600, 2)]
    const result = planPomodoroRecovery(entries, FALLBACK, options())
    expect(result.summary.addedCount).toBe(0)
    expect(result.entries).toBe(entries)
  })

  it('stores recovered time exactly even when the tomatoes carried no tracked stats', () => {
    const entries = [{ id: 'a', abandoned: false, pct: 2.5, createdAt: 1 }, { id: 'b', abandoned: true, pct: 2.5, createdAt: 2 }]
    const { entries: recovered } = planPomodoroRecovery(entries, FALLBACK, options())
    const added = recovered.find(p => p.recovered)
    expect(added.focusSecs).toBe(1500)
    const again = planPomodoroRecovery(recovered, FALLBACK, options())
    expect(again.summary.spentSecs).toBe(3000)
  })

  it('falls back to the focus length when there are no completed tomatoes yet', () => {
    const { summary } = planPomodoroRecovery([partial('a', 3000, 1)], FALLBACK, options())
    expect(summary).toMatchObject({ have: 0, shouldHave: 2, averageSecs: 1500 })
  })
})
