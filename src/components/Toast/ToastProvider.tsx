import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastInput } from './toastContext'
import './Toast.css'

interface ToastItem extends ToastInput {
  id: number
}

const ICONS = { success: CheckCircle2, error: TriangleAlert, info: Info } as const
const DEFAULT_DURATION = 4500

/** Lightweight toasts in a polite live region (screen readers announce them). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++
      // Keep at most 3 on screen.
      setToasts((all) => [...all.slice(-2), { ...toast, id }])
      const duration = toast.duration ?? DEFAULT_DURATION
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone]
          return (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <Icon size={18} aria-hidden />
              <p className="toast__message">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  className="btn btn--sm toast__action"
                  onClick={() => {
                    toast.action?.onClick()
                    dismiss(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button type="button" className="icon-btn toast__close" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
