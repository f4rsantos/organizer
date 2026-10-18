import { isValid, parseISO } from 'date-fns'

const SECOND_SEMESTER_LAST_MONTH = 6

function twoDigitYear(year) {
  return String(year % 100).padStart(2, '0')
}

export function suggestSemesterName(startDate) {
  const start = startDate ? parseISO(startDate) : null
  if (!start || !isValid(start)) return ''
  const year = start.getFullYear()
  const isSpring = start.getMonth() + 1 <= SECOND_SEMESTER_LAST_MONTH
  const firstYear = isSpring ? year - 1 : year
  return `${firstYear}/${twoDigitYear(firstYear + 1)} ${isSpring ? 'S2' : 'S1'}`
}

export function semesterDraftStatus({ startDate, endDate }) {
  if (!startDate || !endDate) return 'incomplete'
  return endDate > startDate ? 'ready' : 'endBeforeStart'
}

export function semesterFromDraft({ name, startDate, endDate }) {
  return {
    name: name?.trim() || suggestSemesterName(startDate),
    startDate,
    endDate,
  }
}
