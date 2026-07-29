import { findPhrase, stripPhrase, stripFirstPhrase, mergeWordGroups } from '../wordMatch.js'

const NUMBER_RE = /-?\d+(?:[.,]\d+)?/g
const PERCENT_RE = /(\d+(?:[.,]\d+)?)\s*%/

function splitClassAndComponent(remainder, classes, forWords) {
  const lower = remainder.toLowerCase()

  for (const cls of classes) {
    if (!cls.name) continue
    const name = cls.name.toLowerCase()
    const idx = lower.indexOf(name)
    if (idx === -1) continue

    let joined = `${remainder.slice(0, idx)} ${remainder.slice(idx + name.length)}`

    for (const fw of forWords) {
      joined = stripPhrase(joined, fw)
    }

    const componentName = joined.replace(/\s+/g, ' ').trim()
    return { classId: cls.id, className: cls.name, componentName }
  }

  return null
}

export function parseGradeCommand(rawText, classes, locale) {
  const words = mergeWordGroups('gradeWords', locale)
  const text = rawText.trim()
  if (!text || !classes?.length) return null

  const lower = text.toLowerCase()

  const addComponentPhrase = findPhrase(lower, words.addComponent)
  if (addComponentPhrase) {
    let remainder = stripFirstPhrase(text, addComponentPhrase)

    const percentMatch = remainder.match(PERCENT_RE)
    let weight = null
    if (percentMatch) {
      weight = Number(percentMatch[1].replace(',', '.')) / 100
      remainder = remainder.replace(percentMatch[0], ' ')
      const weightWord = findPhrase(remainder.toLowerCase(), words.weight)
      if (weightWord) remainder = stripFirstPhrase(remainder, weightWord)
    }

    const split = splitClassAndComponent(remainder, classes, words.forWords)
    if (!split || !split.componentName) return null

    return {
      type: 'addComponent',
      classId: split.classId,
      componentName: split.componentName,
      weight,
    }
  }

  const gradeWord = findPhrase(lower, words.grade)
  if (!gradeWord) return null

  const numbers = [...text.matchAll(NUMBER_RE)]
  if (numbers.length === 0) return null
  const gradeValue = Number(numbers[0][0].replace(',', '.'))

  let remainder = stripFirstPhrase(text, gradeWord)
  remainder = remainder.replace(numbers[0][0], ' ')

  const split = splitClassAndComponent(remainder, classes, words.forWords)
  if (!split || !split.componentName) return null

  return {
    type: 'setGrade',
    classId: split.classId,
    componentName: split.componentName,
    grade: gradeValue,
  }
}
