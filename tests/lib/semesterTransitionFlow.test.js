import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/presetsFirebase', () => ({
  fetchPresetFromFirebase: vi.fn(async key => {
    if (key === 'summer') return { updatedAt: 1, data: { name: 'Verão', startDate: '2026-07-01', endDate: '2026-09-15', classes: [{ name: 'Análise' }], holidays: [{ name: 'H', startDate: '2026-08-01', endDate: '2026-08-02' }] } }
    if (key === 's2') return { updatedAt: 1, data: { startDate: '2026-09-20', endDate: '2027-01-30' } }
    if (key === 'no-dates') return { updatedAt: 1, data: { name: 'Sem datas', classes: [{ name: 'X' }] } }
    return null
  }),
  fetchPresetMetaFromFirebase: vi.fn(async () => ({ updatedAt: 1 })),
}))

const { useStore } = await import('@/store/useStore')
const { transitionSemester } = await import('@/lib/presets')

describe('transitionSemester end to end', () => {
  beforeEach(() => {
    const s = useStore.getState()
    useStore.setState({
      semesters: [], classes: [], tasks: [], events: [], holidays: [],
      kanban: {}, grades: {}, dismissedNextSemester: {},
      activeSemesterId: null, courseAvg: { previousAvg: 14, numSemesters: 3 },
    })
    return s
  })

  it('replaces the old semester, carries the chosen data, and advances the average', async () => {
    const store = useStore.getState()
    const oldId = store.addSemester({ name: '2a2s', presetKey: '2a2s', startDate: '2026-02-09', endDate: '2026-06-03' })
    store.addClass({ semesterId: oldId, name: 'Análise', ects: 6 })
    const oldClassId = useStore.getState().classes[0].id
    store.setGradeComponents(oldId, oldClassId, [{ id: 'c1', name: 'Exame', weight: 1, grade: 16 }])
    store.addTask({ semesterId: oldId, classId: oldClassId, title: 'carry me', weekEnd: '2026-10-01' })
    store.addTask({ semesterId: oldId, title: 'leave me', weekEnd: '2026-03-01' })
    store.addEvent({ semesterId: oldId, title: 'future', date: '2026-10-05' })

    const newId = await transitionSemester(oldId, 'summer', { kanban: true, tasks: true, events: true }, {
      getState: useStore.getState,
      getClasses: () => useStore.getState().classes,
      ...store,
    })

    const s = useStore.getState()
    expect(s.semesters).toHaveLength(1)
    expect(s.activeSemesterId).toBe(newId)
    expect(s.semesters[0].startDate).toBe('2026-07-01')
    expect(s.semesters[0].endDate).toBe('2026-09-15')
    expect(s.semesters[0].previousPresetKey).toBe('2a2s')
    expect(s.holidays.map(h => h.name)).toEqual(['H'])

    expect(s.tasks.map(t => t.title)).toEqual(['carry me'])
    expect(s.tasks[0].semesterId).toBe(newId)
    expect(s.tasks[0].classId).toBe(s.classes.find(c => c.name === 'Análise').id)
    expect(s.events.map(e => e.title)).toEqual(['future'])
    expect(s.events[0].semesterId).toBe(newId)

    expect(s.courseAvg).toEqual({ previousAvg: 14.5, numSemesters: 4 })
    expect(s.grades[oldId]).toBeUndefined()
    expect(s.kanban[oldId]).toBeUndefined()
  })

  it('does not count a summer semester toward the course average', async () => {
    const store = useStore.getState()
    const oldId = store.addSemester({ name: 'Verão', presetKey: 'summer', previousPresetKey: '2a2s', startDate: '2026-07-01', endDate: '2026-09-15' })
    store.addClass({ semesterId: oldId, name: 'Análise', ects: 6 })
    store.setGradeComponents(oldId, useStore.getState().classes[0].id, [{ id: 'c1', name: 'E', weight: 1, grade: 18 }])

    await transitionSemester(oldId, 's2', { kanban: true, tasks: true, events: true }, {
      getState: useStore.getState,
      getClasses: () => useStore.getState().classes,
      ...store,
    })

    expect(useStore.getState().courseAvg).toEqual({ previousAvg: 14, numSemesters: 3 })
  })

  it('does not count a semester whose classes all have zero ects', async () => {
    const store = useStore.getState()
    const oldId = store.addSemester({ name: '2a2s', presetKey: '2a2s', startDate: '2026-02-09', endDate: '2026-06-03' })
    store.addClass({ semesterId: oldId, name: 'Análise', ects: 0 })
    store.addClass({ semesterId: oldId, name: 'Física', ects: 0 })
    const ids = useStore.getState().classes.map(c => c.id)
    ids.forEach(id => store.setGradeComponents(oldId, id, [{ id: 'c1', name: 'E', weight: 1, grade: 18 }]))

    await transitionSemester(oldId, 'summer', { kanban: true, tasks: true, events: true }, {
      getState: useStore.getState,
      getClasses: () => useStore.getState().classes,
      ...store,
    })

    expect(useStore.getState().courseAvg).toEqual({ previousAvg: 14, numSemesters: 3 })
  })

  it('leaves the old semester untouched when the preset has no dates', async () => {
    const store = useStore.getState()
    const oldId = store.addSemester({ name: '2a2s', presetKey: '2a2s', startDate: '2026-02-09', endDate: '2026-06-03' })
    store.addClass({ semesterId: oldId, name: 'Análise', ects: 6 })
    store.addTask({ semesterId: oldId, title: 'stay put', weekEnd: '2026-10-01' })

    await expect(transitionSemester(oldId, 'no-dates', { kanban: true, tasks: true, events: true }, {
      getState: useStore.getState,
      getClasses: () => useStore.getState().classes,
      ...store,
    })).rejects.toThrow('preset-no-dates missing dates')

    const s = useStore.getState()
    expect(s.semesters).toHaveLength(1)
    expect(s.semesters[0].id).toBe(oldId)
    expect(s.activeSemesterId).toBe(oldId)
    expect(s.tasks.map(t => t.title)).toEqual(['stay put'])
    expect(s.tasks[0].semesterId).toBe(oldId)
    expect(s.courseAvg).toEqual({ previousAvg: 14, numSemesters: 3 })
  })
})
