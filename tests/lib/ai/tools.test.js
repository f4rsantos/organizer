import { describe, it, expect } from 'vitest'
import { buildNeutralTools, buildProactiveTools, TOOL_TARGET_TYPES } from '@/lib/ai/tools'

describe('buildNeutralTools', () => {
  it('omits query in requests mode', () => {
    const tools = buildNeutralTools({ optimizeFor: 'requests' })
    expect(tools.some(tool => tool.name === 'query')).toBe(false)
  })

  it('includes query in tokens mode', () => {
    const tools = buildNeutralTools({ optimizeFor: 'tokens' })
    expect(tools.some(tool => tool.name === 'query')).toBe(true)
  })

  it('includes query in balanced mode', () => {
    const tools = buildNeutralTools({ optimizeFor: 'balanced' })
    expect(tools.some(tool => tool.name === 'query')).toBe(true)
  })

  it('includes the fixed set of non-query tools in both modes', () => {
    const requestsNames = buildNeutralTools({ optimizeFor: 'requests' }).map(tool => tool.name)
    const tokensNames = buildNeutralTools({ optimizeFor: 'tokens' }).map(tool => tool.name)
    const expectedBase = ['create', 'update', 'delete', 'openView', 'research', 'done', 'fetch']
    for (const name of expectedBase) {
      expect(requestsNames).toContain(name)
      expect(tokensNames).toContain(name)
    }
  })

  it('create, update, delete take array-shaped inputs', () => {
    const tools = buildNeutralTools({ optimizeFor: 'requests' })
    const create = tools.find(tool => tool.name === 'create')
    const update = tools.find(tool => tool.name === 'update')
    const del = tools.find(tool => tool.name === 'delete')
    expect(create.parameters.properties.items.type).toBe('array')
    expect(update.parameters.properties.patches.type).toBe('array')
    expect(del.parameters.properties.ids.type).toBe('array')
  })

  it('target type enum covers the documented types', () => {
    expect(TOOL_TARGET_TYPES).toEqual([
      'task',
      'event',
      'note',
      'folder',
      'habit',
      'class',
      'kanbanCard',
    ])
  })

  it('defaults to requests-mode behaviour when optimizeFor is omitted', () => {
    const tools = buildNeutralTools()
    expect(tools.some(tool => tool.name === 'query')).toBe(false)
  })
})

describe('buildProactiveTools', () => {
  it('exposes exactly one suggest tool with an optional suggestion string', () => {
    const tools = buildProactiveTools()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('suggest')
    expect(tools[0].parameters.properties.suggestion.type).toBe('string')
    expect(tools[0].parameters.required ?? []).not.toContain('suggestion')
  })
})
