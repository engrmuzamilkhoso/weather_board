import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../../hooks/usePreferences'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="icon-btn icon-btn--bordered"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
