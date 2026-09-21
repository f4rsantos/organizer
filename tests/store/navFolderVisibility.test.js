import { describe, it, expect } from 'vitest'
import { normalizeState } from '../../src/store/migrations'

const FOLDER_ID = 'folder_abc123'

function normalizeNavbar(navbar) {
  const state = normalizeState({ settings: { navbar } })
  return state.settings.navbar
}

describe('navbar folder visibility', () => {
  it('keeps a folder visibility entry through normalization', () => {
    const navbar = normalizeNavbar({
      order: ['tasks', FOLDER_ID, 'settings'],
      visibility: { [FOLDER_ID]: 'mobile' },
      folders: [{ id: FOLDER_ID, label: 'More', icon: 'more', children: ['focus'] }],
    })
    expect(navbar.visibility[FOLDER_ID]).toBe('mobile')
  })

  it('keeps the folder id in order', () => {
    const navbar = normalizeNavbar({
      order: ['tasks', FOLDER_ID, 'settings'],
      visibility: { [FOLDER_ID]: 'desktop' },
      folders: [{ id: FOLDER_ID, label: 'More', icon: 'more', children: [] }],
    })
    expect(navbar.order).toContain(FOLDER_ID)
  })

  it('drops visibility for folder ids that no longer exist', () => {
    const navbar = normalizeNavbar({
      order: ['tasks', 'settings'],
      visibility: { folder_gone: 'mobile' },
      folders: [],
    })
    expect(navbar.visibility.folder_gone).toBeUndefined()
  })

  it('still drops unknown non-folder visibility keys', () => {
    const navbar = normalizeNavbar({
      order: ['tasks', 'settings'],
      visibility: { bogusTab: 'none' },
      folders: [],
    })
    expect(navbar.visibility.bogusTab).toBeUndefined()
  })
})
