/**
 * Timezone strategy: both providers give us the city's UTC offset in seconds.
 * We shift the epoch by that offset and then format/read the result *as UTC*.
 * That yields the wall-clock time in the city regardless of the viewer's own
 * timezone, with no timezone database needed.
 */

const shift = (epochMs: number, offsetSec: number) => new Date(epochMs + offsetSec * 1000)

/** `YYYY-MM-DD` of the given instant in a city with `offsetSec`. */
export function cityDateKey(epochMs: number, offsetSec: number): string {
  return shift(epochMs, offsetSec).toISOString().slice(0, 10)
}

/** Hour of day (0–23) of the given instant in the city. */
export function cityHour(epochMs: number, offsetSec: number): number {
  return shift(epochMs, offsetSec).getUTCHours()
}

export function formatCityTime(epochMs: number, offsetSec: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(shift(epochMs, offsetSec))
}

export function formatCityDate(epochMs: number, offsetSec: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(shift(epochMs, offsetSec))
}

/** "+05:00" style label for the city's offset. */
export function formatUtcOffset(offsetSec: number): string {
  const sign = offsetSec >= 0 ? '+' : '−'
  const abs = Math.abs(offsetSec)
  const h = String(Math.floor(abs / 3600)).padStart(2, '0')
  const m = String(Math.floor((abs % 3600) / 60)).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

/** Labels a `YYYY-MM-DD` key relative to the city's today. */
export function formatDayLabel(dateKey: string, todayKey: string): { short: string; long: string } {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const long = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
  if (dateKey === todayKey) return { short: 'Today', long }
  const short = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(date)
  return { short, long }
}

export function formatDayNumber(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${dateKey}T12:00:00Z`),
  )
}

/** "just now", "5 min ago", "3 h ago", or a date for anything older than a day. */
export function formatRelativeTime(epochMs: number, now = Date.now()): string {
  const diffMin = Math.round((now - epochMs) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} h ago`
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(epochMs))
}

/** Device-local `YYYY-MM-DD` (reminders run on the user's clock, not the city's). */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
