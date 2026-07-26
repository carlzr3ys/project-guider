import Lenis from 'lenis'
import { useCallback, useEffect, useRef } from 'react'
import 'lenis/dist/lenis.css'

export function useLenis({ paused = false } = {}) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    })

    lenisRef.current = lenis

    let frame = 0
    function raf(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    const lenis = lenisRef.current
    if (!lenis) return
    if (paused) {
      lenis.stop()
      document.documentElement.classList.add('lenis-stopped')
    } else {
      lenis.start()
      document.documentElement.classList.remove('lenis-stopped')
    }
  }, [paused])

  const scrollTo = useCallback((target, options = {}) => {
    if (lenisRef.current && !paused) {
      lenisRef.current.scrollTo(target, { offset: -72, ...options })
      return
    }

    if (typeof target === 'string') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [paused])

  return { scrollTo }
}
