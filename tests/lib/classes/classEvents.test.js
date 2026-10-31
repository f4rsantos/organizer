import { describe, it, expect } from 'vitest'
import {
  classForEvent, classNameUnlessInTitle, inferLessonType, isExamTitle, nonClassEventDates,
} from '../../../src/lib/classes/classEvents.js'

const CALC = { id: 'c1', name: 'Cálculo II' }
const PHYS = { id: 'c2', name: 'Física' }
const CLASSES = [CALC, PHYS]

describe('classForEvent', () => {
  it('matches an event whose title starts with the class name regardless of accents', () => {
    expect(classForEvent({ title: 'Calculo II - TP' }, CLASSES)).toBe(CALC)
  })

  it('matches an event that mentions the class name after a prefix', () => {
    expect(classForEvent({ title: 'Aula de Física (PL)' }, CLASSES)).toBe(PHYS)
  })

  it('prefers an explicit classId on the event', () => {
    expect(classForEvent({ title: 'Física', classId: 'c1' }, CLASSES)).toBe(CALC)
  })

  it('matches short abbreviated class names only as whole words', () => {
    const IA = { id: 'ia', name: 'IA' }
    expect(classForEvent({ title: 'IA' }, [IA])).toBe(IA)
    expect(classForEvent({ title: 'IA - TP' }, [IA])).toBe(IA)
    expect(classForEvent({ title: 'Mediateca' }, [IA])).toBeNull()
  })

  it('returns null for events unrelated to any class', () => {
    expect(classForEvent({ title: 'Dentist' }, CLASSES)).toBeNull()
  })
})

describe('isExamTitle', () => {
  it('recognises exam keywords in several languages', () => {
    expect(isExamTitle('Teste 1 Cálculo')).toBe(true)
    expect(isExamTitle('Física - Exame final')).toBe(true)
    expect(isExamTitle('Midterm exam')).toBe(true)
    expect(isExamTitle('Mini-teste')).toBe(true)
  })

  it('does not flag ordinary class titles', () => {
    expect(isExamTitle('Cálculo II - TP')).toBe(false)
    expect(isExamTitle('Testing seminar prep')).toBe(false)
  })
})

describe('inferLessonType', () => {
  it('reads Portuguese university type codes from the title', () => {
    expect(inferLessonType('Cálculo II - T')).toBe('T')
    expect(inferLessonType('Cálculo II (TP)')).toBe('TP')
    expect(inferLessonType('Física PL2')).toBe('PL')
    expect(inferLessonType('Física P')).toBe('P')
  })

  it('reads spelled-out type words', () => {
    expect(inferLessonType('Physics lecture')).toBe('T')
    expect(inferLessonType('Aula prática de Física')).toBe('P')
    expect(inferLessonType('Chemistry lab')).toBe('PL')
  })

  it('reads the university schedule codes OT, S, FORA and EST', () => {
    expect(inferLessonType('SIO - OT')).toBe('OT')
    expect(inferLessonType('PEI S1')).toBe('S')
    expect(inferLessonType('Visita de estudo FORA')).toBe('FORA')
    expect(inferLessonType('EST - Estágio curricular')).toBe('EST')
    expect(inferLessonType('Seminário de IA')).toBe('S')
  })

  it('falls back to other when nothing identifies the type', () => {
    expect(inferLessonType('Cálculo II')).toBe('other')
  })
})

describe('nonClassEventDates', () => {
  it('collects the days covered by events that are not classes', () => {
    const events = [
      { id: 'a', title: 'Cálculo II - T', date: '2026-10-05' },
      { id: 'b', title: 'Birthday', date: '2026-10-06' },
      { id: 'c', title: 'Trip', startDate: '2026-10-08', endDate: '2026-10-09' },
    ]
    expect([...nonClassEventDates(events, CLASSES)].sort()).toEqual(['2026-10-06', '2026-10-08', '2026-10-09'])
  })

  it('treats assessment events from course calendars as non-lessons even when titled like a class', () => {
    const events = [{ id: 'ei-1', title: 'Física M2: presentation', date: '2026-10-13', assessment: true }]
    expect([...nonClassEventDates(events, CLASSES)]).toEqual(['2026-10-13'])
  })

  it('counts a class exam as a highlight day because it is not a lesson', () => {
    const events = [{ id: 'a', title: 'Teste Cálculo II', date: '2026-10-05' }]
    expect([...nonClassEventDates(events, CLASSES)]).toEqual(['2026-10-05'])
  })
})

describe('classNameUnlessInTitle', () => {
  it('drops the class name when the title already says it', () => {
    expect(classNameUnlessInTitle('PEI M3: Digital Accessibility', 'PEI')).toBeNull()
    expect(classNameUnlessInTitle('Teste Física', 'Fisica')).toBeNull()
  })

  it('keeps the class name when the title does not mention it', () => {
    expect(classNameUnlessInTitle('Mini-teste 2', 'Física')).toBe('Física')
  })
})
