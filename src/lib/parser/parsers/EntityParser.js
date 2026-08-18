import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { mergeWordGroups, mergeWordList } from '../wordMatch.js'

export function getPrepositions(locale) {
  return mergeWordGroups('prepositions', locale)
}

function extendForPreposition(unconsumed, matchStart, allowedPreps, { sharedWords, teamWords, withWords }) {
  const prevIdx = unconsumed.findIndex(t => t.index === matchStart) - 1
  if (prevIdx < 0) return null
  const prevToken = unconsumed[prevIdx]
  if (!allowedPreps.includes(prevToken.value)) return null

  let startToken = prevToken.index
  const prevPrevIdx = prevIdx - 1
  if (prevPrevIdx >= 0) {
    const prevPrevToken = unconsumed[prevPrevIdx]
    if ((sharedWords.includes(prevPrevToken.value) && withWords.includes(prevToken.value)) ||
        (teamWords.includes(prevToken.value) && allowedPreps.includes(prevPrevToken.value))) {
      startToken = prevPrevToken.index
    }
  }
  return startToken
}

export class EntityParser extends Parser {
  constructor() {
    super()
  }

  parse(tokens, context) {
    const results = []
    const preps = getPrepositions(context.locale)
    const wordOpts = {
      sharedWords: mergeWordList('sharedWords', context.locale),
      teamWords: mergeWordList('teamWords', context.locale),
      withWords: preps.with,
    }

    if (context.classes?.length) {
      const classTrie = new Trie()
      for (const cls of context.classes) {
        if (cls.name) classTrie.addPhrase(cls.name, { classId: cls.id })
      }
      const matches = classTrie.searchTokens(tokens)
      const unconsumed = tokens.filter(t => !t.consumed)
      const classPreps = [...new Set([...preps.for, ...preps.to, ...preps.in, ...preps.on])]

      for (const m of matches) {
        const startToken = extendForPreposition(unconsumed, m.startToken, classPreps, wordOpts)
        results.push({
          startToken: startToken ?? m.startToken,
          endToken: m.endToken,
          value: m.value,
          type: 'class',
          confidence: 0.9
        })
      }
    }

    if (context.teams) {
      const teamTrie = new Trie()
      const memberTrie = new Trie()
      for (const [id, team] of Object.entries(context.teams)) {
        if (team.name) teamTrie.addPhrase(team.name, { teamId: id })
        for (const [mId, member] of Object.entries(team.members ?? {})) {
          if (member?.alias) {
            memberTrie.addPhrase(member.alias, { userId: mId, alias: member.alias, teamId: id })
          }
        }
      }
      const matches = teamTrie.searchTokens(tokens)
      const unconsumed = tokens.filter(t => !t.consumed)
      const teamPreps = [...new Set([...preps.with, ...preps.for])]

      for (const m of matches) {
        const startToken = extendForPreposition(unconsumed, m.startToken, teamPreps, wordOpts)
        if (startToken != null) {
          results.push({
            startToken,
            endToken: m.endToken,
            value: m.value,
            type: 'team',
            confidence: 0.95
          })
        }
      }

      const memberMatches = memberTrie.searchTokens(tokens)
      const memberPreps = [...new Set([...preps.to, ...preps.for, ...preps.with])]
      for (const m of memberMatches) {
        const startToken = extendForPreposition(unconsumed, m.startToken, memberPreps, wordOpts)
        results.push({
          startToken: startToken ?? m.startToken,
          endToken: m.endToken,
          value: m.value,
          type: 'member',
          confidence: 0.95
        })
      }
    }

    if (context.columns?.length) {
      const colTrie = new Trie()
      for (const col of context.columns) {
        if (col.title) colTrie.addPhrase(col.title, { columnId: col.id })
      }
      const matches = colTrie.searchTokens(tokens)
      const unconsumed = tokens.filter(t => !t.consumed)
      const columnPreps = [...new Set([...preps.on, ...preps.in, ...preps.to])]

      for (const m of matches) {
        const startToken = extendForPreposition(unconsumed, m.startToken, columnPreps, wordOpts)
        if (startToken != null) {
          results.push({
            startToken,
            endToken: m.endToken,
            value: m.value,
            type: 'column',
            confidence: 0.95
          })
        }
      }
    }

    return results
  }
}
