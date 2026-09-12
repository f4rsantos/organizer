export const TOOL_TARGET_TYPES = [
  'task',
  'event',
  'note',
  'folder',
  'habit',
  'class',
  'kanbanCard',
]

const ID_SCHEMA = { type: 'string' }

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: TOOL_TARGET_TYPES },
    fields: { type: 'object' },
  },
  required: ['type', 'fields'],
}

const PATCH_SCHEMA = {
  type: 'object',
  properties: {
    id: ID_SCHEMA,
    type: { type: 'string', enum: TOOL_TARGET_TYPES },
    fields: { type: 'object' },
  },
  required: ['id', 'type', 'fields'],
}

const CREATE_TOOL = {
  name: 'create',
  description: 'Create one or more items in a single batch',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TOOL_TARGET_TYPES },
      items: { type: 'array', items: ITEM_SCHEMA },
    },
    required: ['type', 'items'],
  },
}

const UPDATE_TOOL = {
  name: 'update',
  description: 'Update one or more existing items in a single batch',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TOOL_TARGET_TYPES },
      patches: { type: 'array', items: PATCH_SCHEMA },
    },
    required: ['type', 'patches'],
  },
}

const DELETE_TOOL = {
  name: 'delete',
  description: 'Delete one or more existing items in a single batch',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TOOL_TARGET_TYPES },
      ids: { type: 'array', items: ID_SCHEMA },
    },
    required: ['type', 'ids'],
  },
}

const OPEN_VIEW_TOOL = {
  name: 'openView',
  description: 'Navigate the app UI to a specific view or target',
  parameters: {
    type: 'object',
    properties: {
      target: { type: 'string' },
    },
    required: ['target'],
  },
}

const RESEARCH_TOOL = {
  name: 'research',
  description: 'Perform external research for a query',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
    required: ['query'],
  },
}

const DONE_TOOL = {
  name: 'done',
  description: 'Signal that the task is complete and summarize the outcome',
  parameters: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
    },
    required: ['summary'],
  },
}

const QUERY_TOOL = {
  name: 'query',
  description: 'Query existing items of a given type with an optional filter',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TOOL_TARGET_TYPES },
      filter: { type: 'object' },
    },
    required: ['type'],
  },
}

const FETCH_TOOL = {
  name: 'fetch',
  description: 'Fetch full details for a set of item ids',
  parameters: {
    type: 'object',
    properties: {
      ids: { type: 'array', items: ID_SCHEMA },
    },
    required: ['ids'],
  },
}

const BASE_TOOLS = [
  CREATE_TOOL,
  UPDATE_TOOL,
  DELETE_TOOL,
  OPEN_VIEW_TOOL,
  RESEARCH_TOOL,
  DONE_TOOL,
  FETCH_TOOL,
]

export function buildNeutralTools({ optimizeFor } = {}) {
  if (optimizeFor === 'tokens') {
    return [...BASE_TOOLS, QUERY_TOOL]
  }
  return [...BASE_TOOLS]
}
