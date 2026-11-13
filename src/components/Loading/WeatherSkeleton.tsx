import './WeatherSkeleton.css'

/** Mirrors the real layout so content doesn't jump when data arrives. */
export function WeatherSkeleton({ cityName }: { cityName?: string }) {
  return (
    <div className="weather-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading weather{cityName ? ` for ${cityName}` : ''}…
      </p>
      <div className="card weather-skeleton__hero" aria-hidden>
        <div className="skeleton" style={{ width: '42%', height: 26 }} />
        <div className="skeleton" style={{ width: '28%', height: 14, marginTop: 10 }} />
        <div className="weather-skeleton__main">
          <div className="skeleton" style={{ width: 84, height: 84, borderRadius: 20 }} />
          <div style={{ display: 'grid', gap: 10, flex: 1 }}>
            <div className="skeleton" style={{ width: 140, height: 60 }} />
            <div className="skeleton" style={{ width: 110, height: 16 }} />
          </div>
        </div>
        <div className="weather-skeleton__stats">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 56 }} />
          ))}
        </div>
      </div>
      <div className="card weather-skeleton__forecast" aria-hidden>
        <div className="skeleton" style={{ width: 120, height: 14 }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 40 }} />
        ))}
      </div>
    </div>
  )
}
