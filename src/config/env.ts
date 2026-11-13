/**
 * Reads build-time configuration once. Keys are optional on purpose: without
 * them the app still works using the keyless Open-Meteo fallbacks, and the UI
 * says so instead of failing.
 */
export const env = {
  openWeatherApiKey: (import.meta.env.VITE_OPENWEATHER_API_KEY ?? '').trim(),
  rapidApiKey: (import.meta.env.VITE_RAPIDAPI_KEY ?? '').trim(),
  rapidApiHost: (import.meta.env.VITE_RAPIDAPI_HOST ?? '').trim() || 'wft-geo-db.p.rapidapi.com',
} as const
