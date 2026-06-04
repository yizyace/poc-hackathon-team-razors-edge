import { AnimatePresence, motion } from 'framer-motion'

import { useReducedMotion } from '../../hooks/useReducedMotion'

export interface PackagePhotoProps {
  src: string
  alt: string
  /** When true, an amber scan-line overlay is shown over the image. */
  isProcessing: boolean
}

/**
 * The package capture being fed through the pipeline. While the Vision
 * Inspector is working (`isProcessing`), a translucent overlay with an amber
 * horizontal scan line sweeps top-to-bottom and a "SCANNING…" caption sits in
 * the lower-left. The overlay fades out via AnimatePresence when processing
 * stops. Under reduced motion the overlay is a static dim wash (no sweep).
 */
export default function PackagePhoto({ src, alt, isProcessing }: PackagePhotoProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-surface">
      <img loading="lazy" src={src} alt={alt} className="h-full w-full object-cover" />

      <AnimatePresence>
        {isProcessing ? (
          <motion.div
            key="scan-overlay"
            className="absolute inset-0 overflow-hidden bg-void/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {reducedMotion ? (
              // Static marker line for users who opt out of motion.
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber/70 shadow-glow-amber" />
            ) : (
              <motion.div
                className="absolute inset-x-0 top-0 h-0.5 bg-amber shadow-glow-amber"
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
              />
            )}
            <span className="absolute bottom-2 left-3 font-mono text-[11px] uppercase tracking-widest text-amber">
              Scanning…
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
