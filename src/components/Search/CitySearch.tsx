import { AlertCircle, Loader2, MapPin, Search, SearchX, WifiOff, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useCitySearch } from '../../hooks/useCitySearch'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { City } from '../../types/city'
import { validateCityQuery } from '../../utils/validation'
import { HighlightMatch } from './HighlightMatch'
import './CitySearch.css'

interface CitySearchProps {
  onSelect: (city: City) => void
}

/**
 * Accessible autocomplete (WAI-ARIA 1.2 combobox pattern).
 *  - Validation runs on blur (once the user has typed) and on Enter; errors
 *    clear live as the input is corrected.
 *  - A city can only be chosen from the suggestions, so free text that isn't
 *    a real, geocoded place can never reach the weather request.
 *  - ↑/↓ move, Enter selects, Escape closes, click outside closes, "/" focuses.
 */
export function CitySearch({ onSelect }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const search = useCitySearch(query)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const listId = `${id}-list`
  const errorId = `${id}-error`
  const optionId = (index: number) => `${id}-option-${index}`

  const results = search.status === 'success' ? search.results : []
  const showDropdown = isOpen && search.status !== 'idle' && !error
  const activeOption = showDropdown && activeIndex >= 0 && activeIndex < results.length ? optionId(activeIndex) : undefined

  useClickOutside(wrapperRef, () => setIsOpen(false), isOpen)

  // "/" focuses search from anywhere (unless the user is typing in a field).
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keep the highlighted option visible when navigating a long list.
  useEffect(() => {
    if (activeOption) document.getElementById(activeOption)?.scrollIntoView({ block: 'nearest' })
  }, [activeOption])

  const select = (city: City) => {
    onSelect(city)
    setQuery('')
    setIsDirty(false)
    setError(null)
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setIsOpen(true)
        if (results.length) setActiveIndex((i) => (i + 1) % results.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setIsOpen(true)
        if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
        break
      case 'Enter': {
        event.preventDefault()
        const active = activeIndex >= 0 ? results[activeIndex] : undefined
        if (isOpen && active) {
          select(active)
          return
        }
        const validationError = validateCityQuery(query)
        setIsDirty(true)
        if (validationError) {
          setError(validationError)
          return
        }
        setIsOpen(true)
        if (search.status === 'empty') {
          setError(`No cities match “${query.trim()}”. Check the spelling or try a larger nearby city.`)
        } else if (search.status === 'success') {
          // Don't guess — make the user confirm which place they mean.
          setActiveIndex(0)
        }
        break
      }
      case 'Escape':
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
          setActiveIndex(-1)
        } else if (query) {
          setQuery('')
          setError(null)
          setIsDirty(false)
        }
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="search" ref={wrapperRef}>
      <div className={`search__field ${error ? 'search__field--invalid' : ''}`}>
        <label htmlFor={id} className="visually-hidden">
          Search for a city
        </label>
        <Search size={18} className="search__icon" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          className="input search__input"
          type="text"
          role="combobox"
          placeholder="Search any city…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown && results.length ? listId : undefined}
          aria-activedescendant={activeOption}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            setIsDirty(true)
            setIsOpen(true)
            setActiveIndex(-1)
            // Clear the error as soon as the input becomes valid again.
            if (error) setError(validateCityQuery(value))
          }}
          onFocus={() => setIsOpen(true)}
          // Reopen after Escape: the input keeps focus, so `focus` won't fire again.
          onClick={() => setIsOpen(true)}
          onBlur={() => {
            if (isDirty) setError(validateCityQuery(query))
            setIsOpen(false)
          }}
          onKeyDown={handleKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="search__clear"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('')
              setError(null)
              setIsDirty(false)
              inputRef.current?.focus()
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <kbd className="search__kbd" aria-hidden>
            /
          </kbd>
        )}
      </div>

      {error && (
        <p id={errorId} className="search__error" role="alert">
          <AlertCircle size={15} aria-hidden />
          {error}
        </p>
      )}

      {showDropdown && (
        // preventDefault on mousedown keeps focus in the input, so clicking an option doesn't blur-validate.
        <div className="search__dropdown" onMouseDown={(event) => event.preventDefault()}>
          {search.status === 'pending' && (
            <div className="search__status">
              <Loader2 size={16} className="spin" aria-hidden />
              Searching cities…
            </div>
          )}

          {search.status === 'error' && (
            <div className="search__status search__status--error">
              <WifiOff size={16} aria-hidden />
              <span>{search.error}</span>
            </div>
          )}

          {search.status === 'empty' && (
            <div className="search__status search__status--empty">
              <SearchX size={18} aria-hidden />
              <div>
                <p className="search__status-title">No cities found for “{search.query}”</p>
                <p>Check the spelling, or try a larger nearby city.</p>
              </div>
            </div>
          )}

          {search.status === 'success' && (
            <ul id={listId} role="listbox" aria-label="City suggestions" className="search__list">
              {results.map((city, index) => (
                <li
                  key={city.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  className="search__option"
                  onClick={() => select(city)}
                  onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                >
                  <MapPin size={16} className="search__option-icon" aria-hidden />
                  <span className="search__option-text">
                    <span className="search__option-name">
                      <HighlightMatch text={city.name} query={search.query} />
                    </span>
                    <span className="search__option-meta">{[city.region, city.country].filter(Boolean).join(', ')}</span>
                  </span>
                  {city.countryCode && <span className="search__option-code">{city.countryCode}</span>}
                </li>
              ))}
            </ul>
          )}

          {search.notice && search.status !== 'error' && <p className="search__notice">{search.notice}</p>}
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">
        {search.status === 'success'
          ? `${results.length} ${results.length === 1 ? 'city' : 'cities'} found. Use up and down arrows to choose.`
          : search.status === 'empty'
            ? 'No cities found.'
            : ''}
      </p>
    </div>
  )
}
