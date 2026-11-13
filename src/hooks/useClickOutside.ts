import { useEffect, useRef, type RefObject } from 'react'

/** Calls `onOutside` for pointer presses outside `ref` while `enabled`. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled = true): void {
  // Keep the latest callback without re-subscribing on every render.
  const callback = useRef(onOutside)
  useEffect(() => {
    callback.current = onOutside
  })

  useEffect(() => {
    if (!enabled) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) callback.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [ref, enabled])
}
