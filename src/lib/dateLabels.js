import { parseISO } from 'date-fns'

export function mondayIndex(date) {
  return (date.getDay() + 6) % 7
}

export function longDate(t, iso) {
  const date = parseISO(iso)
  return `${t.weekdays[mondayIndex(date)]}, ${date.getDate()} ${t.months[date.getMonth()]}`
}

const SHORT_MONTH_CHARS = 3

export function shortDate(t, iso) {
  const date = parseISO(iso)
  return `${t.weekdaysShort[mondayIndex(date)]} ${date.getDate()} ${t.months[date.getMonth()].slice(0, SHORT_MONTH_CHARS)}`
}
