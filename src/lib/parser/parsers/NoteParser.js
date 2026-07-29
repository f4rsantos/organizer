import { findPhrase, stripFirstPhrase, mergeWordGroups } from '../wordMatch.js'

export function parseNoteCommand(rawText, locale) {
  const words = mergeWordGroups('noteWords', locale)
  const text = rawText.trim()
  if (!text) return null

  const lower = text.toLowerCase()
  const addWord = findPhrase(lower, words.addWords)
  if (!addWord) return null

  const folderWord = findPhrase(lower, words.folder)
  const noteWord = !folderWord ? findPhrase(lower, words.note) : null

  const kindWord = folderWord || noteWord
  if (!kindWord) return null

  let remainder = stripFirstPhrase(text, addWord)
  remainder = stripFirstPhrase(remainder, kindWord)
  const title = remainder.replace(/\s+/g, ' ').trim()

  if (folderWord) return { type: 'addFolder', name: title }
  return { type: 'addNote', title }
}
