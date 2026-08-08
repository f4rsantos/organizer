import { describe, it, expect } from 'vitest'
import { en } from './strings/en.js'
import { goalMessage, milestoneFor, pickTone, GOAL_TONES } from './goalMessages.js'

describe('milestoneFor', () => {
  it('picks day1 on the very first check-in', () => {
    expect(milestoneFor({ streak: 1, total: 1, rescued: false })).toBe('day1')
  })

  it('picks early for a run of 2 to 6', () => {
    expect(milestoneFor({ streak: 2, total: 2, rescued: false })).toBe('early')
    expect(milestoneFor({ streak: 6, total: 6, rescued: false })).toBe('early')
  })

  it('picks the week and month milestones exactly', () => {
    expect(milestoneFor({ streak: 7, total: 7, rescued: false })).toBe('week')
    expect(milestoneFor({ streak: 30, total: 30, rescued: false })).toBe('month')
  })

  it('falls back to daily otherwise', () => {
    expect(milestoneFor({ streak: 12, total: 12, rescued: false })).toBe('daily')
  })

  it('lets rescue win over everything', () => {
    expect(milestoneFor({ streak: 1, total: 9, rescued: true })).toBe('rescue')
  })
})

describe('goalMessage', () => {
  it('returns the custom message verbatim', () => {
    const msg = goalMessage({ t: en, tone: 'custom', customMessage: '  Keep swimming  ', streak: 3, total: 3 })
    expect(msg).toBe('Keep swimming')
  })

  it('returns an empty string for a blank custom message', () => {
    expect(goalMessage({ t: en, tone: 'custom', customMessage: '', streak: 1, total: 1 })).toBe('')
  })

  it('pulls the right milestone line for a tone', () => {
    expect(goalMessage({ t: en, tone: 'game', streak: 7, total: 7 }))
      .toBe(en.goalMessages.game.week)
    expect(goalMessage({ t: en, tone: 'warm', streak: 1, total: 1 }))
      .toBe(en.goalMessages.warm.day1)
  })

  it('uses the rescue line when a period was missed', () => {
    expect(goalMessage({ t: en, tone: 'upbeat', streak: 1, total: 5, rescued: true }))
      .toBe(en.goalMessages.upbeat.rescue)
  })

  it('resolves random to a real tone based on the seed', () => {
    const seen = new Set()
    for (let seed = 0; seed < 8; seed += 1) seen.add(pickTone('random', seed))
    expect([...seen].every(tone => GOAL_TONES.includes(tone))).toBe(true)
    expect(seen.size).toBeGreaterThan(1)
  })

  it('never returns undefined for a random tone', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const msg = goalMessage({ t: en, tone: 'random', streak: 3, total: 3, seed })
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    }
  })
})
