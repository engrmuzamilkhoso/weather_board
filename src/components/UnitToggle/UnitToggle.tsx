import type { TemperatureUnit } from '../../types/weather'
import './UnitToggle.css'

const OPTIONS: { value: TemperatureUnit; label: string; name: string }[] = [
  { value: 'metric', label: '°C', name: 'Celsius' },
  { value: 'imperial', label: '°F', name: 'Fahrenheit' },
]

/** Segmented °C/°F switch. Conversion is display-only — no refetch. */
export function UnitToggle({ unit, onChange }: { unit: TemperatureUnit; onChange: (unit: TemperatureUnit) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Temperature unit">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={unit === option.value}
          aria-label={option.name}
          title={option.name}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
