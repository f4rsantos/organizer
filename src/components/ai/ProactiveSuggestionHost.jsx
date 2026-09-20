import { useProactiveSuggestions } from '@/hooks/useProactiveSuggestions'
import { ProactiveSuggestionBubble } from './ProactiveSuggestionBubble'

export function ProactiveSuggestionHost() {
  useProactiveSuggestions()
  return <ProactiveSuggestionBubble />
}
