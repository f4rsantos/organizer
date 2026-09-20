import { describe, it, expect } from 'vitest'
import {
  buildNeutralTools, buildProactiveTools, TOOL_TARGET_TYPES,
  FOCUS_CONTROL_ACTIONS, NOTIFICATION_CONTROL_ACTIONS,
} from '@/lib/ai/tools'

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
    const expectedBase = [
      'create', 'update', 'delete', 'openView', 'research', 'done', 'fetch',
      'focusControl', 'notificationControl', 'updateSafeSettings',
    ]
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
      'gradeComponent',
    ])
  })

  it('defaults to requests-mode behaviour when optimizeFor is omitted', () => {
    const tools = buildNeutralTools()
    expect(tools.some(tool => tool.name === 'query')).toBe(false)
  })

  it('focusControl exposes the full lifecycle action enum', () => {
    const tools = buildNeutralTools()
    const focusControl = tools.find(tool => tool.name === 'focusControl')
    expect(focusControl.parameters.properties.action.enum).toEqual(FOCUS_CONTROL_ACTIONS)
    expect(focusControl.parameters.required).toEqual(['action'])
  })

  it('notificationControl exposes its action enum and optional fields', () => {
    const tools = buildNeutralTools()
    const notificationControl = tools.find(tool => tool.name === 'notificationControl')
    expect(notificationControl.parameters.properties.action.enum).toEqual(NOTIFICATION_CONTROL_ACTIONS)
    expect(notificationControl.parameters.required).toEqual(['action'])
  })

  it('updateSafeSettings takes an object of fields', () => {
    const tools = buildNeutralTools()
    const updateSafeSettings = tools.find(tool => tool.name === 'updateSafeSettings')
    expect(updateSafeSettings.parameters.properties.fields.type).toBe('object')
    expect(updateSafeSettings.parameters.required).toEqual(['fields'])
  })

  it('never adds the new action tools to the proactive tool list', () => {
    const proactiveNames = buildProactiveTools().map(tool => tool.name)
    expect(proactiveNames).not.toContain('focusControl')
    expect(proactiveNames).not.toContain('notificationControl')
    expect(proactiveNames).not.toContain('updateSafeSettings')
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
