import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A native <dialog>: focus trapping, Esc to close and the inert background
 * come from the browser rather than from custom code.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="modal-title"
      className={`m-auto max-h-[min(92dvh,900px)] w-[calc(100%-24px)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl ${
        wide ? 'max-w-2xl' : 'max-w-lg'
      }`}
    >
      {open && (
        <div className="flex max-h-[min(92dvh,900px)] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
            <h2 id="modal-title" className="text-base font-semibold">
              {title}
            </h2>
            <button className="btn btn-ghost btn-icon -mr-2 size-9" onClick={onClose} aria-label="Close">
              <X className="size-4.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex items-center gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
