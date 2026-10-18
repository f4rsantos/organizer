import { cn } from '@/lib/utils'

export function AppMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('text-primary', className)} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
