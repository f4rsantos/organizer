import { parseTaskTokens } from './nlpParse.js'
import { tokenize, consumeTokens, matchTokenSequence, getUnconsumedText } from './tokenizer.js'
import { EntityParser } from './parsers/EntityParser.js'
import { getLocalePack } from './locales/index.js'
import { parseFocusCommand } from './parsers/FocusParser.js'
import { parseGradeCommand } from './parsers/GradeParser.js'
import { parseNoteCommand } from './parsers/NoteParser.js'
import { getMutationVerbs } from './parsers/ActionParser.js'
import { mergeWordGroups } from './wordMatch.js'

const entityParser = new EntityParser()

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Some locales define these keys as a bare string rather than a list.
function asWordList(value, fallback) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value) return [value]
  return fallback
}

// Locales list infinitives ("começar") but users type conjugated forms ("começa").
function clauseOpenerVerbs(locale) {
  const focus = locale?.focusWords ?? {}
  const raw = [
    ...(focus.start ?? []),
    ...(focus.stop ?? []),
    ...(focus.reset ?? []),
    ...(focus.skip ?? []),
    ...(locale?.navVerbs ?? [])
  ]
  const out = new Set()
  for (const w of raw) {
    const word = w.toLowerCase()
    if (word.includes(' ')) continue
    out.add(word)
    const stem = word.replace(/(ar|er|ir)$/, '')
    if (stem.length >= 3 && stem !== word) {
      out.add(stem)
      out.add(`${stem}a`)
      out.add(`${stem}e`)
    }
  }
  return [...out]
}

function splitClauses(tokens, addWords, andWords, extraVerbs) {
  const verbs = new Set([...asWordList(addWords, ['add']), ...(extraVerbs ?? [])].map(w => w.toLowerCase()))
  const conjunctions = new Set(asWordList(andWords, ['and']).map(w => w.toLowerCase()))

  const clauses = []
  let current = []

  const endsWithComma = tok => tok.original.endsWith(',')
  // A comma usually rides on the end of a content token ("15h,"), so only drop the token
  // outright when it carries no content of its own. Otherwise the comma is a clause
  // separator rather than part of the title, so strip it from the retained token.
  const dropIfEmpty = arr => {
    if (arr.length === 0) return
    const last = arr[arr.length - 1]
    if (last.value === '') arr.pop()
    else if (endsWithComma(last)) {
      arr[arr.length - 1] = { ...last, original: last.original.replace(/,+$/, '') }
    }
  }

  for (const t of tokens) {
    let boundary = false
    let dropConjunction = false

    if (verbs.has(t.value) && current.length > 0) {
      const last = current[current.length - 1]
      if (endsWithComma(last)) {
        boundary = true
      } else if (conjunctions.has(last.value) && current.length > 1) {
        boundary = true
        dropConjunction = true
      }
    }

    if (boundary) {
      if (dropConjunction) current.pop()
      dropIfEmpty(current)
      if (current.length > 0) clauses.push(current)
      current = [t]
    } else {
      current.push(t)
    }
  }
  if (current.length > 0) clauses.push(current)
  return clauses
}

// Peeks whether the clause opens with a mutation verb (e.g. "remove", "complete") before any
// keyword consumption has happened, so "remove the card X" isn't misread as adding a new card.
function startsWithMutationVerb(tokens, locale) {
  const unconsumed = tokens.filter(t => !t.consumed)
  if (unconsumed.length === 0) return false
  for (const phrase of Object.keys(getMutationVerbs(locale))) {
    const words = phrase.split(/\s+/)
    if (words.length > unconsumed.length) continue
    const matches = words.every((w, i) => unconsumed[i].value === w)
    if (matches) return true
  }
  return false
}

function consumeKeywords(tokens, words) {
  let found = false
  for (const w of words ?? []) {
    const seq = w.toLowerCase().split(/\s+/)
    const res = matchTokenSequence(tokens, seq)
    if (res) {
      consumeTokens(tokens, res.startToken, res.endToken, 'keyword')
      found = true
    }
  }
  return found
}

function splitHabitNote(text, noteWords) {
  const raw = (text ?? '').trim()
  if (!raw) return { query: '', note: '' }

  for (const w of noteWords ?? []) {
    const colonRe = new RegExp(`(?:^|\\s)${escapeRe(w)}\\s*:\\s*`, 'i')
    const colonHit = raw.match(colonRe)
    if (colonHit) {
      return {
        query: raw.slice(0, colonHit.index).trim(),
        note: raw.slice(colonHit.index + colonHit[0].length).trim(),
      }
    }
  }

  for (const w of noteWords ?? []) {
    const phraseRe = new RegExp(`(?:^|\\s)${escapeRe(w)}(?:\\s+|$)`, 'i')
    const hit = raw.match(phraseRe)
    if (hit && hit.index > 0) {
      return {
        query: raw.slice(0, hit.index).trim(),
        note: raw.slice(hit.index + hit[0].length).trim(),
      }
    }
  }

  const dashHit = raw.match(/\s+[-–—]\s+/)
  if (dashHit) {
    return {
      query: raw.slice(0, dashHit.index).trim(),
      note: raw.slice(dashHit.index + dashHit[0].length).trim(),
    }
  }

  return { query: raw, note: '' }
}

// "ppt 1, 2, 3" is three PPTs, but "ppt 1, video 2, text 3" is three different things, so a
// prefix is only carried onto items that are bare enumerators.
const BARE_ENUMERATOR_RE = /^(?:\d{1,3}|[a-z]|[ivxlcdm]{1,4})[.)\-º°ª]?$/i

function carryTitlePrefix(titles) {
  let prefix = null
  return titles.map(title => {
    const item = title.trim()
    if (BARE_ENUMERATOR_RE.test(item)) {
      return prefix ? `${prefix} ${item}` : item
    }
    const stripped = item.replace(/\s+(?:\d{1,3}|[a-z]|[ivxlcdm]{1,4})[.)\-º°ª]?$/i, '').trim()
    prefix = stripped || null
    return item
  })
}

function splitMultipleTasks(tokens, t) {
  const andWords = asWordList(t.quickActionAndWords, ['and']).map(escapeRe).join('|')
  const respectivelyWords = asWordList(t.quickActionRespectivelyWords, ['respectively']).map(escapeRe).join('|')
  const ordinalWords = asWordList(t.quickActionOrdinalWords, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']).map(escapeRe).join('|')
  const forWords = asWordList(t.quickActionForWords, ['for']).map(escapeRe).join('|')

  const splitPattern = new RegExp(`,\\s*(?:${andWords})\\s+|,\\s*|\\s+(?:${andWords})\\s+`, 'i')

  const unconsumedText = getUnconsumedText(tokens)

  const respectivelyMatch = unconsumedText.match(new RegExp(`(.+?)\\s+(?:${forWords})\\s+(.+?)\\s+(?:${respectivelyWords})$`, 'i'))
  if (respectivelyMatch) {
    const titles = respectivelyMatch[1].split(splitPattern).map(s=>s.trim()).filter(Boolean)
    const dates = respectivelyMatch[2].split(splitPattern).map(s=>s.trim()).filter(Boolean)
    if (titles.length > 1) {
      tokens.forEach(tk => { if(!tk.consumed) tk.consumed = true })
      return { titles: carryTitlePrefix(titles), dates, type: 'respectively' }
    }
  }

  const sequentialMatch = unconsumedText.match(new RegExp(`(.+?),\\s*((?:${ordinalWords})\\s+(?:${forWords})\\s+.+)$`, 'i'))
  if (sequentialMatch) {
    const titles = sequentialMatch[1].split(splitPattern).map(s=>s.trim()).filter(Boolean)
    const dates = []
    const tokensArr = sequentialMatch[2].split(/,\s*/)
    const dateExtractPattern = new RegExp(`^(?:${ordinalWords})\\s+(?:${forWords})\\s+(.+)$`, 'i')
    for (const token of tokensArr) {
      const dm = token.match(dateExtractPattern)
      if (dm) dates.push(dm[1].trim())
    }
    if (titles.length > 1) {
      tokens.forEach(tk => { if(!tk.consumed) tk.consumed = true })
      return { titles: carryTitlePrefix(titles), dates, type: 'sequential' }
    }
  }

  const forPrefixPattern = new RegExp(`^(?:${forWords})\\s+`, 'i')

  const titles = unconsumedText.split(splitPattern)
    .map(s => s.trim().replace(forPrefixPattern, ''))
    .filter(Boolean)

  if (titles.length > 1) {
    tokens.forEach(tk => { if(!tk.consumed) tk.consumed = true })
    return { titles: carryTitlePrefix(titles), dates: [], type: 'list' }
  }

  return null
}

export function parseQuickAction(raw, { classes = [], now = new Date(), t = {}, columns = [], teams = {}, lang = 'en', locale, apps = {}, navbar = {} } = {}) {
  if (!raw || !raw.trim()) return []

  const resolvedLocale = locale || getLocalePack(lang)

  const tokensAll = tokenize(raw)
  // consumeTokens indexes into the clause array, so indices must be clause-local.
  const clauses = splitClauses(
    tokensAll,
    t.quickActionAddWords,
    t.quickActionAndWords,
    clauseOpenerVerbs(resolvedLocale)
  ).map(clause => clause.map((tok, i) => ({ ...tok, index: i })))
  const results = []

  const taskWords = asWordList(t.quickActionTaskWords, ['task'])
  const eventWords = asWordList(t.quickActionEventWords, ['calendar event', 'event'])
  const cardWords = asWordList(t.quickActionCardWords, ['kanban card', 'card'])

  // Determiners only — words like pt "de"/"a" also carry meaning inside a title, and
  // consumeKeywords would strip them mid-title.
  const articleWords = asWordList(t.quickActionArticleWords, ['a', 'an', 'the'])

  const boardWords = asWordList(t.quickActionBoardWords, ['kanban', 'board'])
  const forWordList = asWordList(t.quickActionForWords, ['for'])
  const andWordList = asWordList(t.quickActionAndWords, ['and'])
  const onWordList = asWordList(t.quickActionOnWords, ['on'])

  const taskWordsPlural = asWordList(t.quickActionTaskWordsPlural, ['tasks'])
  const eventWordsPlural = asWordList(t.quickActionEventWordsPlural, ['calendar events', 'events'])
  const cardWordsPlural = asWordList(t.quickActionCardWordsPlural, ['kanban cards', 'cards'])

  const habitWords = mergeWordGroups('habitWords', resolvedLocale)

  for (let tokens of clauses) {
    const mutationLed = startsWithMutationVerb(tokens, resolvedLocale)

    let habitNote = ''
    if (mutationLed) {
      const clauseText = tokens.map(tok => tok.original).join(' ')
      const split = splitHabitNote(clauseText, habitWords.note)
      if (split.note) {
        habitNote = split.note
        tokens = tokenize(split.query).map((tok, i) => ({ ...tok, index: i }))
      }
    }

    const isPluralCard = !mutationLed && consumeKeywords(tokens, cardWordsPlural)
    const isPluralEvent = !mutationLed && consumeKeywords(tokens, eventWordsPlural)
    const isPluralTask = !mutationLed && consumeKeywords(tokens, taskWordsPlural)
    const isPlural = isPluralCard || isPluralEvent || isPluralTask

    const isTask = !mutationLed && (consumeKeywords(tokens, taskWords) || isPluralTask)
    const isEvent = !mutationLed && (consumeKeywords(tokens, eventWords) || isPluralEvent)
    const isCard = !mutationLed && (consumeKeywords(tokens, cardWords) || isPluralCard)
    // "cards on the kanban" — the board noun survives when it isn't adjacent to the card word.
    if (isCard) consumeKeywords(tokens, boardWords)

    let kind = 'task'
    if (isCard) kind = 'kanbanCard'
    else if (isEvent && !isTask) kind = 'event'

    const alsoCalendar = isTask && isEvent

    const explicitKind = isTask || isEvent || isCard

    if (!explicitKind) {
      const focusCmd = parseFocusCommand(getUnconsumedText(tokens), resolvedLocale)
      if (focusCmd) {
        results.push({ kind: 'focus', ...focusCmd })
        continue
      }

      if (apps.notes) {
        const noteCmd = parseNoteCommand(getUnconsumedText(tokens), resolvedLocale)
        if (noteCmd) {
          results.push({ kind: 'noteAction', ...noteCmd })
          continue
        }
      }

      const gradeCmd = parseGradeCommand(getUnconsumedText(tokens), classes, resolvedLocale)
      if (gradeCmd) {
        results.push({ kind: 'gradeAction', ...gradeCmd })
        continue
      }
    }

    consumeKeywords(tokens, t.quickActionAddWords)

    const context = { locale: resolvedLocale, lang, classes, columns, teams, now, apps, navbar, t, allowMutation: !explicitKind }
    const entities = entityParser.parse(tokens, context)
    for (const e of entities) {
      consumeTokens(tokens, e.startToken, e.endToken, e.type)
    }

    let columnMatch = entities.find(e => e.type === 'column')?.value
    const teamMatch = entities.find(e => e.type === 'team')?.value
    const classMatch = entities.find(e => e.type === 'class')?.value
    const memberMatch = entities.find(e => e.type === 'member')?.value

    if (isPlural) {
      // Strip fillers before splitting, so a trailing particle ("... 3 hinzu") doesn't stop the
      // last item from reading as a bare enumerator.
      consumeKeywords(tokens, articleWords)
      consumeKeywords(tokens, onWordList)
    }

    const mapping = isPlural ? splitMultipleTasks(tokens, t) : null

    if (mapping) {
      for (let i = 0; i < mapping.titles.length; i++) {
        const rawTitle = mapping.titles[i]
        const datePhrase = mapping.dates[i] ?? mapping.dates[mapping.dates.length - 1] ?? ''
        const textToParse = datePhrase ? `${rawTitle} ${datePhrase}` : rawTitle

        const subTokens = tokenize(textToParse)
        const parsed = parseTaskTokens(subTokens, context)

        consumeKeywords(subTokens, forWordList)
        consumeKeywords(subTokens, andWordList)
        consumeKeywords(subTokens, articleWords)
        consumeKeywords(subTokens, onWordList)

        const cleanTitle = getUnconsumedText(subTokens)

        const item = {
          kind,
          title: cleanTitle,
          date: parsed.date,
          week: parsed.week,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          classId: parsed.classId ?? classMatch?.classId ?? null,
          teamId: teamMatch?.teamId ?? null,
          recurrence: parsed.recurrence,
          duration: parsed.duration,
          priority: parsed.priority,
        }
        if (kind === 'kanbanCard') {
          item.columnId = columnMatch?.columnId ?? (columns[0]?.id ?? null)
        } else if (kind === 'task') {
          item.showOnCalendar = alsoCalendar
        }
        results.push(item)
      }
    } else {
      consumeKeywords(tokens, forWordList)
      consumeKeywords(tokens, andWordList)
      consumeKeywords(tokens, articleWords)

      const parsed = parseTaskTokens(tokens, context)
      consumeKeywords(tokens, onWordList)
      const cleanTitle = getUnconsumedText(tokens)

      if (parsed.action && !explicitKind) {
        if (parsed.action.type === 'nav') {
          results.push({ kind: 'navigation', target: parsed.action.target })
          continue
        }
        if (parsed.action.type === 'mut') {
          consumeKeywords(tokens, taskWords)
          consumeKeywords(tokens, eventWords)
          consumeKeywords(tokens, cardWords)

          consumeKeywords(tokens, articleWords)
          const habitScoped = consumeKeywords(tokens, habitWords.habit)

          results.push({
            kind: 'mutation',
            action: parsed.action.action,
            query: getUnconsumedText(tokens),
            note: habitNote,
            habitScoped,
            columnId: columnMatch?.columnId ?? null,
            teamId: teamMatch?.teamId ?? null,
            memberId: memberMatch?.userId ?? null
          })
          continue
        }
      }

      const item = {
        kind,
        title: cleanTitle,
        date: parsed.date,
        week: parsed.week,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        classId: parsed.classId ?? classMatch?.classId ?? null,
        teamId: teamMatch?.teamId ?? null,
        recurrence: parsed.recurrence,
        duration: parsed.duration,
        priority: parsed.priority,
      }
      if (kind === 'kanbanCard') {
        item.columnId = columnMatch?.columnId ?? (columns[0]?.id ?? null)
      } else if (kind === 'task') {
        item.showOnCalendar = alsoCalendar
      }
      results.push(item)
    }
  }

  return results
}
