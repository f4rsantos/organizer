import { describe, it, expect, vi, beforeEach } from 'vitest'

const EI_2A2S = {
  name: '2º Semestre 2º Ano',
  classes: [{ name: 'CBD', ects: 6, color: '#f97316' }, { name: 'IES', ects: 6, color: '#22c55e' }],
  tasks: [{ title: 'TP1', className: 'CBD', priority: 'high', weekStart: 10, weekEnd: 10 }],
  grades: { CBD: { targetGrade: 16, components: [{ name: 'Exame', weight: 0.6, grade: 12 }] } },
  holidays: [{ name: 'Páscoa', startDate: '2026-04-01', endDate: '2026-04-07' }],
}

vi.mock('@/lib/presetsFirebase', () => ({
  fetchPresetFromFirebase: vi.fn(async key => {
    if (key === '2a2s') return { updatedAt: 5, data: EI_2A2S }
    if (key === '3a1s') return { updatedAt: 5, data: { name: '3º Ano 1º Sem', classes: [] } }
    if (key === 's1') return { updatedAt: 2, data: { startDate: '2026-09-14', endDate: '2027-01-30' } }
    if (key === 's2') return { updatedAt: 3, data: { startDate: '2026-02-09', endDate: '2026-06-03' } }
    if (key === 'orphan') return { updatedAt: 1, data: { name: 'Sem datas', classes: [] } }
    return null
  }),
  fetchPresetMetaFromFirebase: vi.fn(async () => ({ updatedAt: 1 })),
}))

const { useStore } = await import('@/store/useStore')
const { fetchPreset, applyPreset, dateSourceKey } = await import('@/lib/presets')

describe('dateSourceKey', () => {
  it('maps EI keys to the generic preset holding the dates', () => {
    expect(dateSourceKey('2a2s')).toBe('s2')
    expect(dateSourceKey('1a1s')).toBe('s1')
    expect(dateSourceKey('3a1s')).toBe('s1')
    expect(dateSourceKey('3a2s')).toBe('s2')
  })

  it('returns null for keys that carry their own dates', () => {
    expect(dateSourceKey('s1')).toBeNull()
    expect(dateSourceKey('s2')).toBeNull()
    expect(dateSourceKey('summer')).toBeNull()
  })
})

describe('fetchPreset date fallback', () => {
  it('fills an EI presets dates from the matching generic preset', async () => {
    const data = await fetchPreset('2a2s')
    expect(data.startDate).toBe('2026-02-09')
    expect(data.endDate).toBe('2026-06-03')
    expect(data.classes).toHaveLength(2)
  })

  it('uses s1 for first semester keys', async () => {
    const data = await fetchPreset('3a1s')
    expect(data.startDate).toBe('2026-09-14')
    expect(data.endDate).toBe('2027-01-30')
  })

  it('keeps dates the preset already defines', async () => {
    const data = await fetchPreset('s2')
    expect(data.startDate).toBe('2026-02-09')
  })

  it('records the updatedAt of both the preset and its date source', async () => {
    const setPresetUpdatedAt = vi.fn()
    await fetchPreset('2a2s', setPresetUpdatedAt)
    expect(setPresetUpdatedAt).toHaveBeenCalledWith('2a2s', 5)
    expect(setPresetUpdatedAt).toHaveBeenCalledWith('s2', 3)
  })

  it('leaves dates absent when no source exists', async () => {
    const data = await fetchPreset('orphan')
    expect(data.startDate).toBeUndefined()
  })
})

describe('applyPreset', () => {
  beforeEach(() => {
    useStore.setState({
      semesters: [], classes: [], tasks: [], events: [], holidays: [],
      kanban: {}, grades: {}, activeSemesterId: null,
    })
  })

  const actions = () => {
    const store = useStore.getState()
    return { ...store, getClasses: () => useStore.getState().classes }
  }

  it('populates a semester from a fetched preset', async () => {
    const data = await fetchPreset('2a2s')
    const semId = applyPreset(data, actions(), '2a2s')

    const s = useStore.getState()
    const sem = s.semesters.find(x => x.id === semId)
    expect(sem).toMatchObject({ startDate: '2026-02-09', endDate: '2026-06-03', presetKey: '2a2s' })
    expect(s.classes.filter(c => c.semesterId === semId).map(c => c.name)).toEqual(['CBD', 'IES'])
    expect(s.holidays.filter(h => h.semesterId === semId)).toHaveLength(1)

    const cbd = s.classes.find(c => c.name === 'CBD')
    const task = s.tasks.find(t => t.semesterId === semId)
    expect(task.classId).toBe(cbd.id)
    expect(s.grades[semId][cbd.id].components[0].name).toBe('Exame')
  })

  it('never imports grade values from a preset', async () => {
    const data = await fetchPreset('2a2s')
    const semId = applyPreset(data, actions(), '2a2s')
    const cbd = useStore.getState().classes.find(c => c.name === 'CBD')
    expect(useStore.getState().grades[semId][cbd.id].components[0].grade).toBeNull()
  })

  it('throws a distinguishable error when dates cannot be resolved', async () => {
    const data = await fetchPreset('orphan')
    expect(() => applyPreset(data, actions(), 'orphan')).toThrow('preset-orphan missing dates')
  })

  it('accepts Firestore Timestamp dates', () => {
    const ts = iso => ({ toDate: () => new Date(`${iso}T00:00:00Z`) })
    const semId = applyPreset(
      { name: 'TS', startDate: ts('2026-02-09'), endDate: ts('2026-06-03') },
      actions(),
      's2',
    )
    expect(useStore.getState().semesters.find(x => x.id === semId))
      .toMatchObject({ startDate: '2026-02-09', endDate: '2026-06-03' })
  })
})
