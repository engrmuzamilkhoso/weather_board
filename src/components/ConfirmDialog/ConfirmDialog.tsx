import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Built on the native <dialog> element: showModal() gives us focus trapping,
 * Escape-to-close, inert background and correct a11y semantics for free.
 * The cancel button is focused first so Enter never destroys data by accident.
 */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) cancels.
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="dialog__panel">
        <h2 id="confirm-title" className="dialog__title">
          {title}
        </h2>
        <p id="confirm-description" className="dialog__description">
          {description}
        </p>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
