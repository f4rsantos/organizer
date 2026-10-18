export function StepHeading({ eyebrow, title, desc }) {
  return (
    <div className="mb-6 space-y-1.5 text-center sm:text-left">
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
      {desc && <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  )
}
