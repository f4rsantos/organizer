import { Parser } from './Parser.js'
import { Trie } from '../Trie.js'
import { en } from '../locales/en.js'
import { mergeWordList } from '../wordMatch.js'

export function getMutationVerbs(locale) {
  return { ...en.mutationVerbs, ...(locale?.mutationVerbs ?? {}) }
}

export class ActionParser extends Parser {
  constructor() {
    super()
  }

  parse(tokens, context) {
    const { t = {}, apps = {}, navbar = {}, allowMutation = true } = context
    const results = []

    const navTrie = new Trie()
    const navVerbs = [...new Set([
      ...mergeWordList('navVerbs', context.locale),
      ...(t.navVerbs ?? []).map(v => v.toLowerCase()),
    ])]
    const activeTabs = ['tasks', 'kanban', 'grades', 'calendar', 'focus', 'settings', ...Object.keys(apps).filter(k => apps[k])]

    for (const v of navVerbs) {
      for (const tabId of activeTabs) {
        const origName = (t[tabId] || tabId).toString().toLowerCase()
        navTrie.addPhrase(`${v} ${origName}`, { type: 'nav', target: tabId })

        const customName = navbar.customNames?.[tabId]
        if (customName) {
          navTrie.addPhrase(`${v} ${customName.toLowerCase()}`, { type: 'nav', target: tabId })
        }
      }
    }

    const navMatches = navTrie.searchTokens(tokens)
    for (const m of navMatches) {
      results.push({
        startToken: m.startToken,
        endToken: m.endToken,
        matchedTokens: m.matchedTokens,
        value: m.value,
        type: 'action',
        confidence: 1.0
      })
    }

    if (allowMutation) {
      const mutTrie = new Trie()
      for (const [phrase, value] of Object.entries(getMutationVerbs(context.locale))) {
        mutTrie.addPhrase(phrase, value)
      }

      const mutMatches = mutTrie.searchTokens(tokens)
      for (const m of mutMatches) {
        results.push({
          startToken: m.startToken,
          endToken: m.endToken,
          matchedTokens: m.matchedTokens,
          value: m.value,
          type: 'action',
          confidence: 0.95
        })
      }
    }

    return results
  }
}
