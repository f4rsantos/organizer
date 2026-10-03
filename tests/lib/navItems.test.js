import { describe, it, expect } from 'vitest'
import { buildNavItems } from '../../src/lib/navItems'

const ICON_KEYS = ['more', 'folder', 'folderOpen', 'star', 'heart', 'bookmark', 'grid']
const TAB_IDS = new Set(['tasks', 'notes', 'settings'])

function navItems({ order, folderDefs, hidden = [] }) {
  const hiddenIds = new Set(hidden)
  return buildNavItems({
    order,
    folderDefs,
    isVisible: id => !hiddenIds.has(id),
    folderVisibleOn: id => !hiddenIds.has(id),
    build: id => ({ id, icon: TAB_IDS.has(id) ? 'tab-icon' : undefined }),
    folderIcon: key => `folder-icon:${key}`,
  })
}

describe('buildNavItems', () => {
  it.each(ICON_KEYS)('never builds an empty %s folder listed in the order as a tab', iconKey => {
    const { items, primary } = navItems({
      order: ['tasks', 'folder_a', 'settings'],
      folderDefs: [{ id: 'folder_a', label: 'More', icon: iconKey, children: [] }],
    })
    expect(items.map(item => item.id)).toEqual(['tasks', 'settings'])
    expect(primary.map(item => item.id)).toEqual(['tasks', 'settings'])
  })

  it('never builds a folder as a tab when all of its children are hidden', () => {
    const { items } = navItems({
      order: ['tasks', 'folder_a', 'notes', 'settings'],
      folderDefs: [{ id: 'folder_a', label: 'More', icon: 'star', children: ['notes'] }],
      hidden: ['notes'],
    })
    expect(items.map(item => item.id)).toEqual(['tasks', 'settings'])
  })

  it('renders a folder with visible children in its order slot, absorbing them', () => {
    const { items } = navItems({
      order: ['tasks', 'folder_a', 'notes', 'settings'],
      folderDefs: [{ id: 'folder_a', label: 'More', icon: 'star', children: ['notes'] }],
    })
    expect(items.map(item => item.id)).toEqual(['tasks', 'folder_a', 'settings'])
    expect(items[1].icon).toBe('folder-icon:star')
    expect(items[1].items.map(item => item.id)).toEqual(['notes'])
  })

  it('shows a hidden folder children as plain tabs', () => {
    const { items } = navItems({
      order: ['tasks', 'folder_a', 'notes'],
      folderDefs: [{ id: 'folder_a', label: 'More', icon: 'star', children: ['notes'] }],
      hidden: ['folder_a'],
    })
    expect(items.map(item => item.id)).toEqual(['tasks', 'notes'])
  })
})
