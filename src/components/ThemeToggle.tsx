import { Monitor, Moon, Sun } from 'lucide-react'
import { useStore, type Theme } from '../store/useStore'

const OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'dark', label: 'Dark', icon: Moon },
]

export function ThemeToggle() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-xl border border-line bg-surface p-0.5">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={theme === id}
          title={label}
          onClick={() => setTheme(id)}
          className={`grid size-8 place-items-center rounded-[10px] transition-colors ${
            theme === id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <Icon className="size-4" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
