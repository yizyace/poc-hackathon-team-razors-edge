export interface GlowDividerProps {
  className?: string
}

/**
 * A thin horizontal rule with an amber glow that fades out toward both
 * edges. Purely decorative, so it is hidden from assistive technology.
 */
export default function GlowDivider({ className }: GlowDividerProps) {
  return (
    <hr
      aria-hidden="true"
      className={
        'border-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent' +
        (className ? ' ' + className : '')
      }
    />
  )
}
