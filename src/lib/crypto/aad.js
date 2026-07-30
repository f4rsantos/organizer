const PREFIX = 'organizer:v1:'

function build(...components) {
  return PREFIX + components.map(c => {
    const s = String(c)
    return `${s.length}:${s}`
  }).join('')
}

export const WHOLE_STATE = '*'

export function aadForLocalSlice(slice) {
  return build('local', slice)
}

export function aadForPersonalSlice(slice) {
  return build('personal', slice)
}

export function aadForTeamSlice(teamId, slice) {
  return build('team', teamId, slice)
}

export function aadForExport(slice) {
  return build('export', slice)
}

export function aadForShare() {
  return build('share')
}

export function aadForWrap(slot) {
  return build('wrap', slot)
}
