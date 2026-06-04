import { useEffect, useState } from 'react'

export interface NavSection {
  id: string
  label: string
}

export interface NavProps {
  sections: NavSection[]
}

/**
 * Fixed section-navigation overlay for the scroll-snap deck.
 *
 * A slim, unobtrusive top bar: a "VISIONOPS" brand mark with a live
 * indicator on the left, and a row of anchor links (one per section) on
 * the right. A single `IntersectionObserver` watches each section so the
 * centered slide's link receives `aria-current="page"` plus amber
 * styling. On small screens the link row collapses into a compact,
 * horizontally-scrollable strip prefixed by a `NN / NN` index pill.
 *
 * The fixed wrapper is `pointer-events-none` so it never blocks scroll or
 * clicks on the deck; only the bar itself is interactive.
 */
export default function Nav({ sections }: NavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return
    }

    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) {
      return
    }

    // Track the entry whose center is closest to the viewport center;
    // the rootMargin shrinks the observation band to the middle third so
    // the slide actually filling the screen wins.
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          if (best === null || entry.intersectionRatio > best.intersectionRatio) {
            best = entry
          }
        }
        if (best !== null) {
          setActiveId(best.target.id)
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (const el of elements) {
      observer.observe(el)
    }

    return () => {
      observer.disconnect()
    }
  }, [sections])

  const activeIndex = sections.findIndex((s) => s.id === activeId)
  const pad = (n: number): string => String(n).padStart(2, '0')
  const indexLabel = `${pad(activeIndex < 0 ? 1 : activeIndex + 1)} / ${pad(sections.length)}`

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Section navigation"
        className="pointer-events-auto mx-auto flex max-w-deck items-center gap-4 px-4 py-3 sm:px-6"
      >
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 rounded-sm font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gmi shadow-glow-gmi" />
          VisionOps
          <span className="ml-1 hidden items-center gap-1 text-[9px] font-normal tracking-[0.2em] text-ink-dim sm:inline-flex">
            <span aria-hidden="true" className="animate-blink text-green">
              ●
            </span>
            LIVE
          </span>
        </a>

        {/* Mobile: compact index pill (the section list below is scrollable). */}
        <span
          aria-hidden="true"
          className="ml-auto shrink-0 rounded-sm border border-border bg-surface/80 px-2 py-1 font-mono text-[10px] tracking-wider text-ink-dim backdrop-blur-sm sm:hidden"
        >
          {indexLabel}
        </span>

        {/* Section links: horizontally scrollable on mobile, inline on >= sm. */}
        <ul
          className="flex min-w-0 items-center gap-4 overflow-x-auto rounded-sm bg-surface/70 px-3 py-1.5 backdrop-blur-sm [-ms-overflow-style:none] [scrollbar-width:none] sm:ml-auto sm:bg-surface/50 [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((s) => {
            const isActive = s.id === activeId
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={'#' + s.id}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    'block whitespace-nowrap rounded-sm font-mono text-[11px] uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber ' +
                    (isActive ? 'text-amber' : 'text-ink-dim hover:text-ink')
                  }
                >
                  {s.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
