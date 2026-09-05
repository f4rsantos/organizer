const DAY_WORDS = {
  0: ['monday', 'mon', 'segunda', 'segunda-feira', 'seg', 'lunes', 'lun', 'lundi', 'montag', 'mo', 'pondeli', 'maandag', 'po'],
  1: ['tuesday', 'tue', 'tues', 'terca', 'terca-feira', 'ter', 'martes', 'mar', 'mardi', 'dienstag', 'di', 'utery', 'ut', 'dinsdag'],
  2: ['wednesday', 'wed', 'quarta', 'quarta-feira', 'qua', 'miercoles', 'mie', 'mercredi', 'mittwoch', 'mi', 'streda', 'st', 'woensdag'],
  3: ['thursday', 'thu', 'thur', 'thurs', 'quinta', 'quinta-feira', 'qui', 'jueves', 'jue', 'jeudi', 'donnerstag', 'do', 'ctvrtek', 'donderdag'],
  4: ['friday', 'fri', 'sexta', 'sexta-feira', 'sex', 'viernes', 'vie', 'vendredi', 'freitag', 'fr', 'patek', 'pa', 'vrydag'],
  5: ['saturday', 'sat', 'sabado', 'sab', 'samedi', 'samstag', 'sonnabend', 'sa', 'sobota', 'so', 'saterdag'],
  6: ['sunday', 'sun', 'domingo', 'dom', 'dimanche', 'sonntag', 'nedele', 'ne', 'sondag'],
}

function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const DAY_LOOKUP = (() => {
  const map = new Map()
  for (const [index, words] of Object.entries(DAY_WORDS)) {
    for (const w of words) {
      const prev = map.get(w)
      if (prev == null) map.set(w, Number(index))
    }
  }
  return map
})()

export function matchDay(token) {
  const key = fold(token).replace(/[.,:;]+$/, '')
  if (!key) return null
  if (DAY_LOOKUP.has(key)) return DAY_LOOKUP.get(key)
  const ordinal = /^([2-7])\s*a?(\s*feira)?$/.exec(key)
  if (ordinal) return Number(ordinal[1]) - 2
  return null
}

function extractDay(line) {
  const parts = line.split(/[\s\u00a0]+/)
  for (let i = 0; i < parts.length; i++) {
    if (i + 1 < parts.length) {
      const pair = matchDay(`${parts[i]} ${parts[i + 1]}`)
      if (pair != null) {
        parts.splice(i, 2)
        return { dayIndex: pair, rest: parts.join(' ') }
      }
    }
    const single = matchDay(parts[i])
    if (single != null) {
      parts.splice(i, 1)
      return { dayIndex: single, rest: parts.join(' ') }
    }
  }
  return null
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function normalizeTime(hour, minute, meridiem) {
  let h = Number(hour)
  const m = Number(minute ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (m > 59) return null
  const mer = meridiem ? fold(meridiem) : null
  if (mer === 'pm' && h < 12) h += 12
  if (mer === 'am' && h === 12) h = 0
  if (h > 23) return null
  return `${pad(h)}:${pad(m)}`
}

const TIME = /(?<!\d)(\d{1,2})(?:\s*[:h.]\s*(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?!\d)/gi

function extractTimes(text) {
  const found = []
  TIME.lastIndex = 0
  let match
  while ((match = TIME.exec(text)) !== null) {
    const bare = match[2] == null && match[3] == null
    const hour = Number(match[1])
    if (hour > 23) continue
    const nextChar = text[match.index + match[0].length]
    if (bare && (match[0].trim().length > 2 || nextChar === '.' )) continue
    const time = normalizeTime(match[1], match[2], match[3])
    if (!time) continue
    found.push({ time, start: match.index, end: match.index + match[0].length })
    if (found.length === 2) break
  }
  return found
}

function fixOcrOnes(text) {
  return text.replace(/\b1(?=[A-Za-z])|(?<=[A-Za-z])1\b/g, 'I')
}

function cleanTitle(text) {
  return text
    .replace(/[‐-―]/g, '-')
    .replace(/\s*[-|,;]\s*$/g, '')
    .replace(/^\s*[-|,;]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}



function isBareCode(part) {
  return /^\d+$/.test(part.trim())
}

export function splitTitleAndNote(text) {
  const parts = String(text ?? '')
    .split(/\s+[-|]\s+|\s{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  if (parts.length <= 1) return { title: fixOcrOnes(cleanTitle(text)), note: '' }

  const head = [parts[0]]
  const tail = []
  for (const part of parts.slice(1)) {
    if (isBareCode(part)) continue
    tail.push(part)
  }

  return {
    title: fixOcrOnes(cleanTitle(head.join(' - '))),
    note: cleanTitle(tail.join(' - ')),
  }
}

export function parseScheduleText(text) {
  const rows = []
  const errors = []
  const lines = String(text ?? '').split(/\r?\n/)

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return

    const day = extractDay(line)
    if (!day) {
      errors.push({ line: i + 1, text: line, reason: 'no-day' })
      return
    }

    const times = extractTimes(day.rest)
    if (!times.length) {
      errors.push({ line: i + 1, text: line, reason: 'no-time' })
      return
    }

    let title = day.rest
    for (let k = times.length - 1; k >= 0; k--) {
      title = title.slice(0, times[k].start) + ' ' + title.slice(times[k].end)
    }
    title = cleanTitle(title.replace(/\b(as|ate|to|until|bis|a)\b/gi, ' '))

    if (!title) {
      errors.push({ line: i + 1, text: line, reason: 'no-title' })
      return
    }

    const split = splitTitleAndNote(title)
    rows.push({
      dayIndex: day.dayIndex,
      startTime: times[0].time,
      endTime: times[1]?.time ?? null,
      title: split.title,
      note: split.note,
    })
  })

  return { rows, errors }
}
