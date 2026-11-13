import { createContext, useContext } from 'react'

export interface ToastInput {
  tone: 'success' | 'error' | 'info'
  message: string
  action?: { label: string; onClick: () => void }
  /** ms; 0 keeps it until dismissed. */
  duration?: number
}

export const ToastContext = createContext<{ notify: (toast: ToastInput) => void } | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context.notify
}
