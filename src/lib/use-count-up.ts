import * as React from 'react'

/** Rolls a number up to `target` (from 0 on mount, then from the last value). */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = React.useState(0)
  const current = React.useRef(0)
  React.useEffect(() => {
    // Hidden tabs get no animation frames, so they'd sit on the old number.
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setValue(target)
      return
    }
    const origin = current.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      current.current = Math.round(origin + (target - origin) * eased)
      setValue(current.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    // Land on the real number even if frames stop coming (background or throttled pages).
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(frame)
      current.current = target
      setValue(target)
    }, duration + 100)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [target, duration])
  return value
}
