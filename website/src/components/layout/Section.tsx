import type { ReactNode } from 'react'

export interface SectionProps {
  /** Anchor id; also the scroll/IntersectionObserver target for nav. */
  id: string
  /** Accessible name for the region landmark. */
  ariaLabel: string
  children: ReactNode
  /** Extra classes (typically background styling) supplied per slide. */
  className?: string
  /**
   * When true, render children edge-to-edge without the centered
   * `max-w-deck` content wrapper (for full-bleed visuals).
   */
  bleed?: boolean
}

/**
 * A single full-height "slide" in the scroll-snap deck.
 *
 * Presentational only: it provides the snap behaviour, the region
 * landmark, and a `tabIndex={-1}` focus target so skip links and
 * anchor navigation can move focus here. Background and accent styling
 * are passed in via `className` by each slide. Unless `bleed` is set,
 * children are constrained to the `max-w-deck` content column.
 */
export default function Section({ id, ariaLabel, children, className, bleed = false }: SectionProps) {
  return (
    <section
      id={id}
      role="region"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={'snap-section relative flex flex-col justify-center overflow-hidden ' + (className ?? '')}
    >
      {bleed ? children : <div className="mx-auto w-full max-w-deck px-6 py-20 sm:py-24">{children}</div>}
    </section>
  )
}
