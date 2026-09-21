import { describe, it, expect } from 'vitest'
import { normalizeState } from '../../src/store/migrations'
import { DATA_SLICES } from '../../src/lib/crypto/sliceCodec'

function roundTrip(state) {
  return normalizeState(JSON.parse(JSON.stringify(state)))
}

const imported = {
  id: 'e1', title: 'CD', note: 'P1 - 04.2.11', color: '#ffab00',
  date: '2026-02-11', startTime: '09:00', endTime: '11:00', allDay: false,
  semesterId: null, importId: 'imp-1',
  recurrence: { freq: 'weekly', interval: 1, until: '2026-06-03' },
}

describe('imported events survive a reload', () => {
  it('keeps the weekly recurrence', () => {
    const out = roundTrip({ events: [imported] })
    expect(out.events[0].recurrence).toEqual({ freq: 'weekly', interval: 1, until: '2026-06-03' })
  })

  it('keeps the importId so undo can find them', () => {
    const out = roundTrip({ events: [imported] })
    expect(out.events[0].importId).toBe('imp-1')
  })

  it('keeps title, note, colour and times', () => {
    const [ev] = roundTrip({ events: [imported] }).events
    expect(ev.title).toBe('CD')
    expect(ev.note).toBe('P1 - 04.2.11')
    expect(ev.color).toBe('#ffab00')
    expect(ev.startTime).toBe('09:00')
    expect(ev.endTime).toBe('11:00')
  })

  it('drops a malformed recurrence rather than keeping junk', () => {
    const out = roundTrip({ events: [{ ...imported, recurrence: { freq: 'hourly' } }] })
    expect(out.events[0].recurrence).toBeNull()
  })

  it('defaults scheduleImports to an array', () => {
    expect(roundTrip({}).scheduleImports).toEqual([])
  })

  it('persists scheduleImports as its own slice', () => {
    expect(DATA_SLICES).toContain('scheduleImports')
    expect(DATA_SLICES).toContain('events')
  })
})
