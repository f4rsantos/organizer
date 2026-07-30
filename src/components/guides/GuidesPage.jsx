import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useGuides, GUIDE_SECTIONS } from '@/lib/guides'
import { GUIDE_SCENES } from './scenes'
import { Button } from '@/components/ui/button'
import '@/components/layout/onboarding/tour.css'
import './guides.css'

function GuideEntry({ id, entry, scene }) {
  const Scene = scene
  return (
    <article id={`guide-${id}`} className="guide-entry scroll-mt-24 md:scroll-mt-8">
      <div className="grid gap-5 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-8 md:items-start">
        <div className="guide-scene-scale order-first">
          {Scene ? <Scene /> : null}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight">{entry.title}</h3>
            <p className="text-sm text-muted-foreground">{entry.summary}</p>
          </div>
          {entry.body.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/80">{paragraph}</p>
          ))}
        </div>
      </div>
    </article>
  )
}

export function GuidesPage({ onClose }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const g = useGuides(lang)
  const columns = useStore(s => s.kanbanColumns)
  const scrollRef = useRef(null)
  const [activeSection, setActiveSection] = useState(GUIDE_SECTIONS[0].id)

  const sceneProps = useMemo(() => ({ t, columns }), [t, columns])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const headings = GUIDE_SECTIONS
      .map(s => root.querySelector(`#guide-section-${s.id}`))
      .filter(Boolean)
    if (!headings.length) return

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveSection(visible.target.id.replace('guide-section-', ''))
    }, { root, rootMargin: '0px 0px -70% 0px', threshold: 0 })

    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [])

  const jumpTo = id => {
    const node = scrollRef.current?.querySelector(`#guide-section-${id}`)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-3 md:px-8 md:py-5">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold md:text-2xl">{g.title}</h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">{g.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={g.close} onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <nav className="guide-chips flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
        {GUIDE_SECTIONS.map(section => (
          <button key={section.id} onClick={() => jumpTo(section.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeSection === section.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
            )}>
            {g.sections[section.id]}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
          <div className="sticky top-4 space-y-0.5">
            {GUIDE_SECTIONS.map(section => (
              <button key={section.id} onClick={() => jumpTo(section.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}>
                {g.sections[section.id]}
              </button>
            ))}
          </div>
        </aside>

        <main ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-10 px-4 py-6 md:px-8 md:py-8">
            {GUIDE_SECTIONS.map(section => (
              <section key={section.id} className="space-y-8">
                <h2 id={`guide-section-${section.id}`}
                  className="scroll-mt-4 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.sections[section.id]}
                </h2>
                {section.entries.map(id => {
                  const Scene = GUIDE_SCENES[id]
                  return (
                    <GuideEntry key={id} id={id} entry={g.entries[id]}
                      scene={Scene ? () => <Scene {...sceneProps} /> : null} />
                  )
                })}
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
