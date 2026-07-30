import { Parser } from './Parser.js'
import { matchUnconsumedTokens, matchTokenSequence } from '../tokenizer.js'
import { Trie } from '../Trie.js'
import { NumberParser } from './NumberParser.js'
import { addDays, addWeeks, nextDay, previousDay, startOfWeek, setMonth, setYear, startOfMonth } from 'date-fns'
import { dictWithEnglishFallback } from '../localeDict.js'

const DATE_SLASH_RE = /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class DateParser extends Parser {
  constructor() {
    super()
    this.trieCache = new Map()
    this.monthTrieCache = new Map()
    this.weekNumberReCache = new Map()
    this.numberParser = new NumberParser()
  }

  getWeekNumberRe(locale) {
    const cacheKey = locale ?? 'default'
    if (this.weekNumberReCache.has(cacheKey)) return this.weekNumberReCache.get(cacheKey)

    const words = locale?.weekWords?.length ? locale.weekWords : ['week']
    const alternation = words.map(escapeRe).join('|')
    const re = new RegExp(`\\b(?:${alternation})\\s*#?\\s*(\\d{1,2})\\b`, 'i')

    this.weekNumberReCache.set(cacheKey, re)
    return re
  }

  getTrie(locale) {
    if (this.trieCache.has(locale)) return this.trieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'weekdays'))) {
      trie.addPhrase(word, { type: 'weekday', val })
    }
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'relativeDates'))) {
      trie.addPhrase(word, { type: 'relative', val })
    }
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'modifiers'))) {
      trie.addPhrase(word, { type: 'modifier', val })
    }
    this.trieCache.set(locale, trie)
    return trie
  }

  getMonthTrie(locale) {
    if (this.monthTrieCache.has(locale)) return this.monthTrieCache.get(locale)

    const trie = new Trie()
    for (const [word, val] of Object.entries(dictWithEnglishFallback(locale, 'months'))) {
      trie.addPhrase(word, { type: 'month', val })
    }
    this.monthTrieCache.set(locale, trie)
    return trie
  }

  parse(tokens, context) {
    const today = context.now || new Date()
    const trie = this.getTrie(context.locale)
    const matches = trie.searchTokens(tokens)

    const results = []

    // Bare "week N" — an explicit semester/ISO week number, not a calendar date.
    const weekNumMatch = matchUnconsumedTokens(tokens, this.getWeekNumberRe(context.locale))
    if (weekNumMatch) {
      const week = Number(weekNumMatch.match[1])
      if (week >= 1 && week <= 53) {
        results.push({
          startToken: weekNumMatch.startToken,
          endToken: weekNumMatch.endToken,
          value: { week },
          type: 'week_number',
          confidence: 0.99
        })
      }
    }

    // "<ordinal/number> week of <month>" e.g. "second week of july"
    const monthTrie = this.getMonthTrie(context.locale)
    const monthMatches = monthTrie.searchTokens(tokens)
    const weekOfWords = context.locale?.weekOfWords ?? ['week of']
    for (const mm of monthMatches) {
      const seqRes = matchTokenSequence(tokens, (weekOfWords[0]).split(/\s+/))
      if (!seqRes || seqRes.endToken + 1 !== mm.startToken) continue

      const numbers = this.numberParser.parse(tokens, context)
      const ordinalNum = numbers.find(n => n.endToken === seqRes.startToken - 1)
      const ordinal = ordinalNum ? ordinalNum.value : 1

      let year = today.getFullYear()
      let monthStart = startOfMonth(setYear(setMonth(today, mm.value.val), year))
      if (monthStart < startOfMonth(today) && (mm.value.val < today.getMonth())) {
        monthStart = startOfMonth(setYear(setMonth(today, mm.value.val), year + 1))
      }
      const weekStartOfMonth = startOfWeek(monthStart, { weekStartsOn: 1 })
      const firstMonday = weekStartOfMonth < monthStart ? addWeeks(weekStartOfMonth, 1) : weekStartOfMonth
      const targetDate = addWeeks(firstMonday, ordinal - 1)

      const startToken = ordinalNum ? ordinalNum.startToken : seqRes.startToken
      results.push({
        startToken,
        endToken: mm.endToken,
        value: { date: targetDate },
        type: 'date_slash',
        confidence: 0.99
      })
    }

    // "week of <date>" — anchor to that date directly, consuming the whole phrase in one match
    // so the bare word "week" can't be separately grabbed by RecurrenceParser as "weekly".
    const weekOfMatch = matchTokenSequence(tokens, (weekOfWords[0]).split(/\s+/))
    if (weekOfMatch) {
      const afterSlash = matchUnconsumedTokens(tokens, DATE_SLASH_RE)
      if (afterSlash && afterSlash.startToken === weekOfMatch.endToken + 1) {
        const m = afterSlash.match
        const day = Number(m[1])
        const month = Number(m[2])
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          let year = m[3] ? Number(m[3]) : today.getFullYear()
          if (year < 100) year += 2000
          const date = new Date(year, month - 1, day)
          if (date.getMonth() === month - 1) {
            results.push({
              startToken: weekOfMatch.startToken,
              endToken: afterSlash.endToken,
              value: { date },
              type: 'date_slash',
              confidence: 0.99
            })
          }
        }
      }
    }

    // Bare "next/this/last week" (no weekday attached) — anchor to that week's Monday.
    const weekModWords = context.locale?.weekWords ?? ['week']
    const bareWeekMatch = matchTokenSequence(tokens, weekModWords)
    if (bareWeekMatch) {
      const modTrie = trie
      const modMatches = modTrie.searchTokens(tokens).filter(m => m.value.type === 'modifier' && m.endToken === bareWeekMatch.startToken - 1)
      if (modMatches.length) {
        const mod = modMatches[0]
        const thisMonday = startOfWeek(today, { weekStartsOn: 1 })
        let target = thisMonday
        if (mod.value.val === 'next') target = addWeeks(thisMonday, 1)
        else if (mod.value.val === 'last') target = addWeeks(thisMonday, -1)

        results.push({
          startToken: mod.startToken,
          endToken: bareWeekMatch.endToken,
          value: { date: target },
          type: 'date_slash',
          confidence: 0.99
        })
      }
    }

    const slashMatch = matchUnconsumedTokens(tokens, DATE_SLASH_RE)
    if (slashMatch) {
      const m = slashMatch.match
      const day = Number(m[1])
      const month = Number(m[2])
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        let year = m[3] ? Number(m[3]) : today.getFullYear()
        if (year < 100) year += 2000
        const date = new Date(year, month - 1, day)
        if (date.getMonth() === month - 1) {
          results.push({
            startToken: slashMatch.startToken,
            endToken: slashMatch.endToken,
            value: { date },
            type: 'date_slash',
            confidence: 0.95
          })
        }
      }
    }

    for (const m of matches) {
      if (m.value.type === 'relative') {
        results.push({
          startToken: m.startToken,
          endToken: m.endToken,
          value: { date: addDays(today, m.value.val) },
          type: 'date_relative',
          confidence: 0.9
        })
      }
    }

    const weekdays = matches.filter(m => m.value.type === 'weekday')
    const modifiers = matches.filter(m => m.value.type === 'modifier')

    for (const wd of weekdays) {
      let d = nextDay(today, wd.value.val)
      let startToken = wd.startToken

      const mod = modifiers.find(m => m.endToken === wd.startToken - 1)
      if (mod) {
        startToken = mod.startToken
        if (mod.value.val === 'last') {
          d = previousDay(today, wd.value.val)
        } else if (mod.value.val === 'next') {
          d = addDays(nextDay(today, wd.value.val), 7)
        } else if (mod.value.val === 'this') {
          const weekStart = startOfWeek(today, { weekStartsOn: 1 })
          d = addDays(weekStart, (wd.value.val + 6) % 7)
        }
      }

      results.push({
        startToken,
        endToken: wd.endToken,
        value: { date: d },
        type: 'date_weekday',
        confidence: mod ? 0.95 : 0.85
      })
    }

    return results
  }
}
