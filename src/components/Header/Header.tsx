import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from './Logo'
import './Header.css'

interface HeaderProps {
  search: ReactNode
  controls: ReactNode
  canInstall: boolean
  onInstall: () => void
}

export function Header({ search, controls, canInstall, onInstall }: HeaderProps) {
  return (
    <header className="header">
      <div className="container header__inner">
        <a className="header__brand" href="/" aria-label="WeatherBoard home">
          <Logo />
          <span className="header__name">WeatherBoard</span>
        </a>
        <div className="header__search">{search}</div>
        <div className="header__actions">
          {canInstall && (
            <button type="button" className="btn btn--sm header__install" onClick={onInstall}>
              <Download size={16} aria-hidden />
              <span>Install</span>
            </button>
          )}
          {controls}
        </div>
      </div>
    </header>
  )
}
