import { format, isValid, parseISO } from 'date-fns'

export function formatDueDate(iso) {
  if (!iso) return ''
  const date = parseISO(iso)
  if (!isValid(date)) return iso
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return format(date, sameYear ? 'd MMM' : 'd MMM yyyy')
}
