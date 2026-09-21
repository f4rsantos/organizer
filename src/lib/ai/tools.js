export const TOOL_TARGET_TYPES = [
  'task',
  'event',
  'note',
  'folder',
  'habit',
  'class',
  'kanbanCard',
  'gradeComponent',
]

export const FOCUS_CONTROL_ACTIONS = ['start', 'pause', 'resume', 'reset', 'skipBreak']

export const NOTIFICATION_CONTROL_ACTIONS = [
  'dismissToast',
  'dismissAlert',
  'clearUnread',
  'clearAllUnread',
  'createReminder',
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

const FOCUS_CONTROL_TOOL = {
  name: 'focusControl',
  description: 'Start, pause, resume, reset the focus session, or skip its current break',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: FOCUS_CONTROL_ACTIONS },
    },
    required: ['action'],
  },
}

const NOTIFICATION_CONTROL_TOOL = {
  name: 'notificationControl',
  description: 'Dismiss a pending toast or alert by id, clear all unread notifications, or create a one-off reminder not tied to a task or event',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: NOTIFICATION_CONTROL_ACTIONS },
      id: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' },
      delayMinutes: { type: 'number' },
    },
    required: ['action'],
  },
}

const UPDATE_SAFE_SETTINGS_TOOL = {
  name: 'updateSafeSettings',
  description: 'Update a small allowlisted set of user preferences (task/focus/calendar alert prefs and similar). Unlisted keys are rejected.',
  parameters: {
    type: 'object',
    properties: {
      fields: { type: 'object' },
    },
    required: ['fields'],
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
  FOCUS_CONTROL_TOOL,
  NOTIFICATION_CONTROL_TOOL,
  UPDATE_SAFE_SETTINGS_TOOL,
]

export function buildNeutralTools({ optimizeFor } = {}) {
  if (optimizeFor === 'tokens' || optimizeFor === 'balanced') {
    return [...BASE_TOOLS, QUERY_TOOL]
  }
  return [...BASE_TOOLS]
}

export const SUGGEST_TOOL = {
  name: 'suggest',
  description: 'Report whether you have a brief proactive suggestion worth surfacing to the user. Omit the "suggestion" argument entirely when you do not have one — do not pass an empty string.',
  parameters: {
    type: 'object',
    properties: {
      suggestion: { type: 'string' },
    },
    required: [],
  },
}

export function buildProactiveTools() {
  return [SUGGEST_TOOL]
}
