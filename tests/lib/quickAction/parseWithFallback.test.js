import { describe, it, expect } from 'vitest'
import { parseWithFallback } from '../../../src/lib/quickAction/parseWithFallback.js'
import { getStrings } from '../../../src/lib/strings/index.js'

const NOW = new Date('2026-10-18T12:00:00')
const base = { now: NOW, columns: [], classes: [], apps: {} }
const parse = (text, lang) => parseWithFallback(text, { ...base, lang, t: getStrings(lang) }, { lang: 'en', t: getStrings('en') })

describe('quick action language fallback', () => {
  it('understands English typed while the app is in Portuguese', () => {
    const [item] = parse('add event dentist friday at 3pm', 'pt')
    expect(item).toMatchObject({ kind: 'event', title: 'dentist', startTime: '15:00' })
  })

  it('understands an English command typed in another language setting', () => {
    const [item] = parse('complete essay', 'de')
    expect(item).toMatchObject({ kind: 'mutation', action: 'complete' })
  })

  it('keeps the app language when it already understood the text', () => {
    const [item] = parse('adicionar tarefa ensaio amanhã', 'pt')
    expect(item).toMatchObject({ kind: 'task', title: 'ensaio', date: '2026-10-19' })
  })

  it('keeps a plain note as typed when neither language finds a command', () => {
    const [item] = parse('comprar pão', 'pt')
    expect(item).toMatchObject({ kind: 'task', title: 'comprar pão' })
  })
})
