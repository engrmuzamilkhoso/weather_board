import { MapPin, Star, X } from 'lucide-react'
import { MAX_FAVORITES } from '../../config/constants'
import type { City } from '../../types/city'
import { isSameCity } from '../../utils/guards'
import './FavouriteCities.css'

interface FavouriteCitiesProps {
  favorites: City[]
  activeCity: City | null
  isPersistent: boolean
  onSelect: (city: City) => void
  onRequestRemove: (city: City) => void
}

export function FavouriteCities({ favorites, activeCity, isPersistent, onSelect, onRequestRemove }: FavouriteCitiesProps) {
  const isFull = favorites.length >= MAX_FAVORITES

  return (
    <section className="card favs" aria-labelledby="favs-title">
      <div className="card__header">
        <h2 id="favs-title" className="card__title">
          <Star size={15} aria-hidden /> Favourites
        </h2>
        <span className={`favs__count tabular ${isFull ? 'favs__count--full' : ''}`} aria-label={`${favorites.length} of ${MAX_FAVORITES} saved`}>
          {favorites.length}/{MAX_FAVORITES}
        </span>
      </div>

      <div className="card__body">
        {favorites.length === 0 ? (
          <div className="favs__empty">
            <span className="favs__empty-icon" aria-hidden>
              <Star size={18} />
            </span>
            <p>
              <strong>No favourites yet.</strong> Tap the star next to a city’s name to pin it here. You can save up to{' '}
              {MAX_FAVORITES}.
            </p>
          </div>
        ) : (
          <ul className="favs__list">
            {favorites.map((city) => {
              const isActive = activeCity !== null && isSameCity(city, activeCity)
              return (
                <li key={city.id} className={`fav ${isActive ? 'fav--active' : ''}`}>
                  <button
                    type="button"
                    className="fav__select"
                    onClick={() => onSelect(city)}
                    aria-current={isActive ? 'true' : undefined}
                    title={[city.name, city.region, city.country].filter(Boolean).join(', ')}
                  >
                    <MapPin size={15} className="fav__icon" aria-hidden />
                    <span className="fav__name">{city.name}</span>
                    <span className="fav__meta">{city.countryCode ?? city.country}</span>
                  </button>
                  <button type="button" className="fav__remove" aria-label={`Remove ${city.name} from favourites`} onClick={() => onRequestRemove(city)}>
                    <X size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {isFull && (
          <p className="favs__hint">You’ve saved the maximum of {MAX_FAVORITES} cities. Remove one to add another.</p>
        )}
        {!isPersistent && (
          <p className="notice notice--warning favs__warning">
            Your browser is blocking local storage, so favourites will be lost when you close this tab.
          </p>
        )}
      </div>
    </section>
  )
}
