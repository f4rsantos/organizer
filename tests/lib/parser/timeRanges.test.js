import { describe, it, expect } from 'vitest'
import { parseQuickAction } from '../../../src/lib/parser/quickActionParse.js'
import { getStrings } from '../../../src/lib/strings/index.js'

const NOW = new Date('2026-10-18T09:00:00')

function first(text, lang = 'en') {
  const [item] = parseQuickAction(text, { t: getStrings(lang), now: NOW, lang })
  return [item.title, item.startTime, item.endTime]
}

describe('time ranges in quick actions', () => {
  it('reads an am/pm range', () => {
    expect(first('add event standup today 10am-11am')).toEqual(['standup', '10:00', '11:00'])
  })

  it('reads a range whose start takes the meridiem of its end', () => {
    expect(first('add event dentist tomorrow 3-4pm')).toEqual(['dentist', '15:00', '16:00'])
  })

  it('keeps a morning start when the end crosses noon', () => {
    expect(first('add event lab friday 11-1pm')).toEqual(['lab', '11:00', '13:00'])
  })

  it('reads minutes on either side of an am/pm range', () => {
    expect(first('add event standup today at 10am-10:30am')).toEqual(['standup', '10:00', '10:30'])
  })

  it('reads "from … to …" and drops both words from the title', () => {
    expect(first('add event review today from 2pm to 3:30pm')).toEqual(['review', '14:00', '15:30'])
  })

  it('reads a Portuguese "das … às …" range', () => {
    expect(first('adicionar evento dentista amanhã das 15h às 16h', 'pt')).toEqual(['dentista', '15:00', '16:00'])
  })

  it('reads a German "von … bis … uhr" range', () => {
    expect(first('füge termin zahnarzt morgen von 15 bis 16 uhr hinzu', 'de')).toEqual(['zahnarzt', '15:00', '16:00'])
  })

  it('still reads a plain 24h range', () => {
    expect(first('add event standup today 10:00-10:30')).toEqual(['standup', '10:00', '10:30'])
  })
})

describe('number ranges that are not times', () => {
  it('leaves "chapters 1 to 3" in the title', () => {
    expect(first('add task read chapters 1 to 3')).toEqual(['read chapters 1 to 3', null, null])
  })
})
