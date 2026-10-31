import { ChevronRight } from 'lucide-react'

export function CardAction({ label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="-mx-5 -mb-5 mt-4 flex w-[calc(100%+2.5rem)] items-center justify-between border-t border-border/60 px-5 py-3 text-left text-sm font-medium transition-colors hover:bg-accent/40">
      {label}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
