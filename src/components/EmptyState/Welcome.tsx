import { MapPin } from 'lucide-react'
import type { City } from '../../types/city'
import { Logo } from '../Header/Logo'
import './Welcome.css'

/** Shortcut destinations. These are place coordinates only — weather is always fetched live. */
const QUICK_PICKS: City[] = [
  { id: 'preset:london', name: 'London', region: 'England', country: 'United Kingdom', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278 },
  { id: 'preset:new-york', name: 'New York', region: 'New York', country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.006 },
  { id: 'preset:tokyo', name: 'Tokyo', region: 'Tokyo', country: 'Japan', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503 },
  { id: 'preset:dubai', name: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708 },
  { id: 'preset:sydney', name: 'Sydney', region: 'New South Wales', country: 'Australia', countryCode: 'AU', latitude: -33.8688, longitude: 151.2093 },
  { id: 'preset:karachi', name: 'Karachi', region: 'Sindh', country: 'Pakistan', countryCode: 'PK', latitude: 24.8607, longitude: 67.0011 },
]

export function Welcome({ onSelect, isOnline }: { onSelect: (city: City) => void; isOnline: boolean }) {
  return (
    <section className="card welcome" aria-labelledby="welcome-title">
      <Logo size={44} />
      <h1 id="welcome-title" className="welcome__title">
        Weather for anywhere, at a glance
      </h1>
      <p className="welcome__text">
        Search for a city above to see current conditions and a five-day forecast. Star the places you check often, and
        WeatherBoard will keep the last one you viewed available offline.
      </p>
      {isOnline ? (
        <>
          <p className="welcome__label">Or start with</p>
          <ul className="welcome__picks">
            {QUICK_PICKS.map((city) => (
              <li key={city.id}>
                <button type="button" className="btn welcome__pick" onClick={() => onSelect(city)}>
                  <MapPin size={15} aria-hidden /> {city.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="notice notice--warning welcome__offline">You’re offline. Connect to the internet to load your first city.</p>
      )}
    </section>
  )
}
