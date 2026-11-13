/** Where a city record came from. Prefixes `City.id` so ids never collide across sources. */
export type CitySource = 'geodb' | 'open-meteo' | 'preset'

/**
 * Provider-independent city. Coordinates are stored so a favourite or the
 * last-viewed city can be re-fetched without searching again.
 */
export interface City {
  id: string
  name: string
  region: string | null
  country: string
  countryCode: string | null
  latitude: number
  longitude: number
}

export interface CitySearchResult {
  cities: City[]
  source: Exclude<CitySource, 'preset'>
  /** Shown under the suggestions when a fallback source was used. */
  notice: string | null
}
