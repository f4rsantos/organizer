import { currentPeriodKey, isCheckedIn } from '../habits.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SOON_DAYS = 7
const RECENTLY_PAST_DAYS = -1
const DUE_SOON = 0
const DUE_LATER = 1
const OVERDUE = 2

function wordsOf(text) {
  return (text ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean)
}

function overlap(queryWords, title) {
  const titleWords = wordsOf(title)
  return queryWords.filter(word => titleWords.includes(word)).length
}

function rankByOverlap(items, query) {
  const queryWords = wordsOf(query)
  if (!queryWords.length) return []
  return items
    .map(item => ({ item, score: overlap(queryWords, item.title) }))
    .filter(entry => entry.score > 0)
}

function dueBucket(time, now) {
  const days = (time - now.getTime()) / MS_PER_DAY
  if (days >= RECENTLY_PAST_DAYS && days <= SOON_DAYS) return DUE_SOON
  if (days > SOON_DAYS) return DUE_LATER
  return OVERDUE
}

function compareByDue(a, b, now) {
  const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0
  const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0
  if (!aTime && !bTime) return 0
  if (!aTime) return 1
  if (!bTime) return -1
  return dueBucket(aTime, now) - dueBucket(bTime, now) || aTime - bTime
}

export function findBestTask(tasks, query, now) {
  const ranked = rankByOverlap((tasks ?? []).filter(t => !t.done), query)
  if (!ranked.length) return null
  ranked.sort((a, b) => b.score - a.score || compareByDue(a.item, b.item, now))
  return ranked[0].item
}

function openForCheckIn(habit, now) {
  const key = currentPeriodKey(habit, now)
  return key !== null && !isCheckedIn(habit, key)
}

export function findBestHabit(habits, query, now) {
  const ranked = rankByOverlap(habits ?? [], query)
  if (!ranked.length) return null
  const openRank = habit => (openForCheckIn(habit, now) ? 0 : 1)
  ranked.sort((a, b) => b.score - a.score || openRank(a.item) - openRank(b.item))
  return ranked[0].item
}
