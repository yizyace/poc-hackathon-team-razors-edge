import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Subscribes to the user's reduced-motion preference.
 *
 * Returns a strict boolean. Defaults to `false` on the first paint
 * (e.g. during SSR or before the media query is evaluated), then
 * reflects live changes to the preference. The listener is cleaned
 * up on unmount.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mql = window.matchMedia(QUERY)
    setReduced(mql.matches)

    const handleChange = (event: MediaQueryListEvent): void => {
      setReduced(event.matches)
    }

    mql.addEventListener('change', handleChange)
    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  return reduced
}

export default useReducedMotion
