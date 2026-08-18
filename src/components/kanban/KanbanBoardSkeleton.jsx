function SkeletonColumn({ cardCount }) {
  return (
    <div className="flex w-full md:flex-1 md:min-w-56 md:h-full shrink-0 flex-col gap-2 rounded-xl p-2 bg-secondary/40">
      <div className="flex items-center justify-between px-1">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="h-5 w-6 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-full md:items-start w-full pb-2">
      <SkeletonColumn cardCount={3} />
      <SkeletonColumn cardCount={2} />
      <SkeletonColumn cardCount={4} />
    </div>
  )
}
