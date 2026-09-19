import { describe, it, expect } from 'vitest'
import { isVisibleOnSurface } from '../../../src/components/layout/useNavTabs'

describe('isVisibleOnSurface', () => {
  it('defaults to visible on both surfaces', () => {
    expect(isVisibleOnSurface({}, 'tasks', 'desktop')).toBe(true)
    expect(isVisibleOnSurface({}, 'tasks', 'mobile')).toBe(true)
  })

  it('hides a mobile-only entry on desktop', () => {
    const vis = { folder_x: 'mobile' }
    expect(isVisibleOnSurface(vis, 'folder_x', 'desktop')).toBe(false)
    expect(isVisibleOnSurface(vis, 'folder_x', 'mobile')).toBe(true)
  })

  it('hides a desktop-only entry on mobile', () => {
    const vis = { folder_x: 'desktop' }
    expect(isVisibleOnSurface(vis, 'folder_x', 'mobile')).toBe(false)
    expect(isVisibleOnSurface(vis, 'folder_x', 'desktop')).toBe(true)
  })

  it('hides a none entry everywhere', () => {
    const vis = { tasks: 'none' }
    expect(isVisibleOnSurface(vis, 'tasks', 'desktop')).toBe(false)
    expect(isVisibleOnSurface(vis, 'tasks', 'mobile')).toBe(false)
  })

  it('reads as hidden when passed a folder id, not the folder object whose lookup would miss and default to visible', () => {
    const vis = { folder_x: 'mobile' }
    const folders = [{ id: 'folder_x', children: ['focus'] }]
    const shown = folders.filter(f => isVisibleOnSurface(vis, f.id, 'desktop'))
    expect(shown).toEqual([])
  })
})
