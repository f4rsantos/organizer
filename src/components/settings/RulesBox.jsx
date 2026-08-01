export function RulesBox({ label, snippet }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3 min-w-0">
      <p className="text-xs font-medium mb-2">{label}</p>
      <pre className="text-[11px] leading-relaxed overflow-x-auto">{snippet}</pre>
    </div>
  )
}
