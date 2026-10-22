import { X } from 'lucide-react'
import { useToasts } from '../store/toast'

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 sm:bottom-6 flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-sm text-bg shadow-lg"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              className="rounded-lg px-2.5 py-1.5 font-semibold text-accent-soft hover:bg-white/10 dark:text-accent"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="rounded-lg p-1.5 opacity-70 hover:bg-white/10 hover:opacity-100" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
