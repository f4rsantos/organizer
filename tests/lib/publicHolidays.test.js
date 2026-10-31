import { describe, it, expect } from 'vitest'
import { localizeHolidays, parseCountries, parsePublicHolidays } from '../../src/lib/publicHolidays.js'

const RESPONSE = [
  {
    startDate: '2026-08-01', endDate: '2026-08-01', nationwide: true,
    name: [{ language: 'DE', text: 'Bundesfeiertag' }, { language: 'FR', text: 'Fête nationale suisse' }, { language: 'EN', text: 'Independence Day' }],
  },
  {
    startDate: '2026-06-13', endDate: '2026-06-13', nationwide: false,
    name: [{ language: 'PT', text: 'Santo António' }],
  },
]

describe('parsePublicHolidays', () => {
  it('keeps only nationwide holidays as calendar holidays with every name', () => {
    expect(parsePublicHolidays(RESPONSE, 'CH')).toEqual([{
      id: 'public:CH:2026-08-01',
      names: RESPONSE[0].name,
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      public: true,
    }])
  })

  it('returns nothing for a malformed response', () => {
    expect(parsePublicHolidays(null, 'PT')).toEqual([])
    expect(parsePublicHolidays({ error: 'x' }, 'PT')).toEqual([])
  })
})

describe('localizeHolidays', () => {
  it('names each holiday in the app language, falling back to the first name', () => {
    const parsed = parsePublicHolidays(RESPONSE, 'CH')
    expect(localizeHolidays(parsed, 'fr')[0].name).toBe('Fête nationale suisse')
    expect(localizeHolidays(parsed, 'cs')[0].name).toBe('Bundesfeiertag')
  })
})

describe('parseCountries', () => {
  it('lists countries alphabetically in the app language', () => {
    const response = [
      { isoCode: 'PT', name: [{ language: 'EN', text: 'Portugal' }, { language: 'DE', text: 'Portugal' }] },
      { isoCode: 'DE', name: [{ language: 'EN', text: 'Germany' }, { language: 'DE', text: 'Deutschland' }] },
    ]
    expect(parseCountries(response, 'de')).toEqual([{ code: 'DE', name: 'Deutschland' }, { code: 'PT', name: 'Portugal' }])
    expect(parseCountries(response, 'pt').map(c => c.name)).toEqual(['Germany', 'Portugal'])
  })
})
