import { nanoid } from '@/lib/ids'
import { setSubcomponentShare } from '@/lib/gradeUtils'

export function useGradeHandlers(semId, classId, components, setGradeComponents) {
  const save = updated => setGradeComponents(semId, classId, updated)

  const updateGrade = (compId, value) =>
    save(components.map(c => c.id === compId ? { ...c, grade: value } : c))

  const addSubcomponent = compId =>
    save(components.map(c => {
      if (c.id !== compId) return c
      const existing = c.subcomponents ?? []
      const newSubs = existing.length === 0
        ? [{ id: nanoid(), grade: null }, { id: nanoid(), grade: null }]
        : [...existing.map(({ share: _share, ...rest }) => rest), { id: nanoid(), grade: null }]
      return { ...c, grade: null, subcomponents: newSubs }
    }))

  const removeSubcomponent = (compId, subId) =>
    save(components.map(c => c.id === compId
      ? { ...c, subcomponents: c.subcomponents.filter(s => s.id !== subId) }
      : c
    ))

  const updateSubGrade = (compId, subId, value) =>
    save(components.map(c => c.id === compId
      ? { ...c, subcomponents: c.subcomponents.map(s => s.id === subId ? { ...s, grade: value } : s) }
      : c
    ))

  const updateSubWeight = (compId, subId, percent, lockedIds) => {
    const component = components.find(c => c.id === compId)
    if (!(component?.weight > 0)) return lockedIds
    const share = percent / 100 / component.weight
    const result = setSubcomponentShare(component.subcomponents, subId, share, lockedIds)
    save(components.map(c => c.id === compId ? { ...c, subcomponents: result.subcomponents } : c))
    return result.lockedIds
  }

  return { updateGrade, addSubcomponent, removeSubcomponent, updateSubGrade, updateSubWeight }
}
