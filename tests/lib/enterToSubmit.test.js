import { describe, it, expect } from 'vitest'
import { isSubmitEnter } from '../../src/lib/enterToSubmit.js'

function keyEvent({ key = 'Enter', tagName = 'INPUT', type = 'text', role = null, shiftKey = false, isComposing = false } = {}) {
  return {
    key,
    shiftKey,
    nativeEvent: { isComposing },
    target: { tagName, type, getAttribute: name => (name === 'role' ? role : null), isContentEditable: false },
  }
}

describe('isSubmitEnter', () => {
  it('applies the form when Enter is pressed in a text, date or time field', () => {
    expect(isSubmitEnter(keyEvent())).toBe(true)
    expect(isSubmitEnter(keyEvent({ type: 'date' }))).toBe(true)
    expect(isSubmitEnter(keyEvent({ type: 'time' }))).toBe(true)
  })

  it('leaves multi-line notes, open dropdowns and Shift+Enter alone', () => {
    expect(isSubmitEnter(keyEvent({ tagName: 'TEXTAREA' }))).toBe(false)
    expect(isSubmitEnter(keyEvent({ role: 'combobox' }))).toBe(false)
    expect(isSubmitEnter(keyEvent({ shiftKey: true }))).toBe(false)
  })

  it('does not fire while an input method is still composing a character', () => {
    expect(isSubmitEnter(keyEvent({ isComposing: true }))).toBe(false)
  })

  it('ignores other keys and buttons, which Enter already activates', () => {
    expect(isSubmitEnter(keyEvent({ key: 'a' }))).toBe(false)
    expect(isSubmitEnter(keyEvent({ tagName: 'BUTTON' }))).toBe(false)
    expect(isSubmitEnter(keyEvent({ type: 'checkbox' }))).toBe(false)
  })
})
