import { describe, it, expect } from 'vitest'
import { onboardingSteps, stepBlocker, isOptionalStep } from '../../../src/lib/onboarding/steps.js'

describe('onboarding steps', () => {
  it('asks for semester dates on a fresh semester setup', () => {
    expect(onboardingSteps({ path: 'fresh', noneMode: false })).toContain('dates')
  })

  it('skips the semester dates step when organising by weeks', () => {
    expect(onboardingSteps({ path: 'fresh', noneMode: true })).not.toContain('dates')
  })

  it('shows the tour before offering the extra apps, then finishes', () => {
    const steps = onboardingSteps({ path: 'fresh', noneMode: false })
    expect(steps.indexOf('apps')).toBe(steps.indexOf('tour') + 1)
    expect(steps.at(-1)).toBe('ready')
  })

  it('does not walk a restoring user through the fresh setup', () => {
    const steps = onboardingSteps({ path: 'restore', noneMode: false })
    expect(steps).toEqual(['welcome', 'restore'])
  })

  it('shows only the welcome step until a path is picked', () => {
    expect(onboardingSteps({ path: null, noneMode: false })).toEqual(['welcome'])
  })
})

describe('onboarding step blockers', () => {
  const semester = { id: 's1', name: 'S1', startDate: '2026-09-14', endDate: '2027-01-29' }

  it('blocks the dates step until a semester with both dates is active', () => {
    expect(stepBlocker('dates', { noneMode: false, semesters: [], activeSemesterId: null })).toBe('needsDates')
  })

  it('blocks the dates step when the active semester is missing an end date', () => {
    const partial = { ...semester, endDate: '' }
    expect(stepBlocker('dates', { noneMode: false, semesters: [partial], activeSemesterId: 's1' })).toBe('needsDates')
  })

  it('lets the dates step through once the active semester has dates', () => {
    expect(stepBlocker('dates', { noneMode: false, semesters: [semester], activeSemesterId: 's1' })).toBe(null)
  })

  it('never blocks the optional steps', () => {
    expect(['classes', 'apps', 'tour'].every(isOptionalStep)).toBe(true)
    expect(isOptionalStep('dates')).toBe(false)
  })
})
