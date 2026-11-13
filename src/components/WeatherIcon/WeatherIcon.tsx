import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { WeatherCondition } from '../../types/weather'
import './WeatherIcon.css'

const ICONS: Record<WeatherCondition, { day: LucideIcon; night: LucideIcon }> = {
  clear: { day: Sun, night: Moon },
  'partly-cloudy': { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  fog: { day: CloudFog, night: CloudFog },
  drizzle: { day: CloudDrizzle, night: CloudDrizzle },
  rain: { day: CloudRain, night: CloudRain },
  snow: { day: CloudSnow, night: CloudSnow },
  thunderstorm: { day: CloudLightning, night: CloudLightning },
}

interface WeatherIconProps {
  condition: WeatherCondition
  isDay?: boolean
  size?: number
  /** Subtle CSS motion (disabled automatically for prefers-reduced-motion). */
  animated?: boolean
  label?: string
}

/** Provider-independent icon — drawn locally, so it also works offline. */
export function WeatherIcon({ condition, isDay = true, size = 24, animated = false, label }: WeatherIconProps) {
  const Icon = isDay ? ICONS[condition].day : ICONS[condition].night
  const tone = condition === 'clear' && !isDay ? 'night' : condition
  return (
    <span
      className={`weather-icon weather-icon--${tone}${animated ? ' weather-icon--animated' : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon size={size} strokeWidth={1.75} />
    </span>
  )
}
