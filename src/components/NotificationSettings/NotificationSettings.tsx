import { AlertCircle, Bell, BellOff, BellRing, Check, CircleSlash, Info, Loader2, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import type { EnableResult, ReminderSettings } from '../../hooks/useNotifications'
import type { BackgroundStatus, NotificationAccess, NotificationCapabilities } from '../../services/notificationService'
import { localDateKey } from '../../utils/dateUtils'
import { timeToMinutes, validateReminderTime } from '../../utils/validation'
import './NotificationSettings.css'

interface NotificationSettingsProps {
  capabilities: NotificationCapabilities
  settings: ReminderSettings
  permission: NotificationAccess
  backgroundStatus: BackgroundStatus
  cityName: string | null
  onEnable: (time: string) => Promise<EnableResult>
  onDisable: () => Promise<void>
  onUpdateTime: (time: string) => void
  onSendTest: () => Promise<string | null>
  onToast: (tone: 'success' | 'error', message: string) => void
}

function nextReminderLabel(time: string, lastShownDate: string | null): string {
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const isToday = minutesNow < timeToMinutes(time) && lastShownDate !== localDateKey(now)
  return `${isToday ? 'Today' : 'Tomorrow'} at ${time}`
}

export function NotificationSettings(props: NotificationSettingsProps) {
  const { capabilities, settings, permission, backgroundStatus, cityName } = props
  const id = useId()
  const [time, setTime] = useState(settings.time)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [flowMessage, setFlowMessage] = useState<{ tone: 'warning' | 'danger'; text: string } | null>(null)
  const [busy, setBusy] = useState<'enable' | 'test' | null>(null)

  const isOn = settings.enabled && permission === 'granted'
  const revoked = settings.enabled && permission !== 'granted'
  const timeChanged = time !== settings.time

  const validateTime = (value: string) => {
    const error = validateReminderTime(value)
    setTimeError(error)
    return error === null
  }

  const handleEnable = async (event: FormEvent) => {
    event.preventDefault()
    if (!validateTime(time)) {
      document.getElementById(`${id}-time`)?.focus()
      return
    }
    setBusy('enable')
    setFlowMessage(null)
    const result = await props.onEnable(time)
    setBusy(null)
    if (result.ok) {
      props.onToast('success', `Daily reminder set for ${time}.`)
    } else if (result.reason === 'invalid-time') {
      setTimeError(result.message)
    } else {
      setFlowMessage({ tone: result.reason === 'dismissed' ? 'warning' : 'danger', text: result.message })
    }
  }

  const handleSaveTime = (event: FormEvent) => {
    event.preventDefault()
    if (!validateTime(time)) return
    props.onUpdateTime(time)
    props.onToast('success', `Reminder time changed to ${time}.`)
  }

  const handleTest = async () => {
    setBusy('test')
    const error = await props.onSendTest()
    setBusy(null)
    props.onToast(error ? 'error' : 'success', error ?? 'Test notification sent.')
  }

  const handleDisable = async () => {
    await props.onDisable()
    setFlowMessage(null)
    props.onToast('success', 'Daily reminder turned off.')
  }

  const timeField = (
    <div className="field">
      <label className="field__label" htmlFor={`${id}-time`}>
        Reminder time
      </label>
      <input
        id={`${id}-time`}
        className="input reminders__time"
        type="time"
        required
        value={time}
        aria-invalid={timeError ? true : undefined}
        aria-describedby={timeError ? `${id}-time-error` : `${id}-time-hint`}
        onChange={(event) => {
          setTime(event.target.value)
          if (timeError) validateTime(event.target.value)
        }}
        onBlur={(event) => validateTime(event.target.value)}
      />
      {timeError ? (
        <p id={`${id}-time-error`} className="field__error">
          <AlertCircle size={14} aria-hidden /> {timeError}
        </p>
      ) : (
        <p id={`${id}-time-hint`} className="field__hint">
          Uses your device’s time zone.
        </p>
      )}
    </div>
  )

  return (
    <section className="card reminders" aria-labelledby={`${id}-title`}>
      <div className="card__header">
        <h2 id={`${id}-title`} className="card__title">
          <Bell size={15} aria-hidden /> Morning reminder
        </h2>
        {isOn && (
          <span className="pill pill--live">
            <span className="pill__dot" aria-hidden /> On
          </span>
        )}
      </div>

      <div className="card__body reminders__body">
        {!capabilities.notifications ? (
          <p className="notice">
            <BellOff size={16} aria-hidden />
            <span className="notice__body">
              This browser doesn’t support notifications, so daily reminders aren’t available here. On iPhone or iPad,
              add WeatherBoard to your Home Screen first (iOS 16.4 or later).
            </span>
          </p>
        ) : isOn ? (
          <>
            <div className="reminders__summary">
              <span className="reminders__summary-icon" aria-hidden>
                <BellRing size={18} />
              </span>
              <div>
                <p className="reminders__summary-title">Daily at {settings.time}</p>
                <p className="reminders__summary-meta">
                  Next: {nextReminderLabel(settings.time, settings.lastShownDate)} · {cityName ?? 'your last viewed city'}
                </p>
              </div>
            </div>

            <form className="reminders__form" noValidate onSubmit={handleSaveTime}>
              {timeField}
              {timeChanged && (
                <button type="submit" className="btn btn--primary reminders__save">
                  Save time
                </button>
              )}
            </form>

            <DeliveryList status={backgroundStatus} />

            <div className="reminders__actions">
              <button type="button" className="btn" onClick={handleTest} disabled={busy !== null}>
                {busy === 'test' ? <Loader2 size={15} className="spin" aria-hidden /> : <Send size={15} aria-hidden />}
                Send test
              </button>
              <button type="button" className="btn btn--ghost" onClick={handleDisable}>
                Turn off
              </button>
            </div>
          </>
        ) : (
          <form className="reminders__form" noValidate onSubmit={handleEnable}>
            <p className="reminders__intro">
              Start the day knowing what to expect. Get one notification each morning with{' '}
              {cityName ? <strong>{cityName}</strong> : 'your last viewed city'}’s temperature, conditions and today’s
              high and low.
            </p>
            {timeField}

            {(revoked || permission === 'denied') && !flowMessage && (
              <p className="notice notice--danger" role="alert">
                <CircleSlash size={16} aria-hidden />
                <span className="notice__body">
                  Notifications are blocked for WeatherBoard. Allow them in your browser’s site settings (the icon next
                  to the address bar), then turn reminders on again.
                </span>
              </p>
            )}
            {flowMessage && (
              <p className={`notice notice--${flowMessage.tone}`} role="alert">
                <AlertCircle size={16} aria-hidden />
                <span className="notice__body">{flowMessage.text}</span>
              </p>
            )}

            <button type="submit" className="btn btn--primary reminders__enable" disabled={busy !== null}>
              {busy === 'enable' ? <Loader2 size={16} className="spin" aria-hidden /> : <Bell size={16} aria-hidden />}
              {busy === 'enable' ? 'Waiting for permission…' : 'Turn on daily reminder'}
            </button>
            <p className="field__hint">
              Your browser will ask for permission to show notifications. You can turn this off at any time.
            </p>
            {revoked && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleDisable}>
                Turn reminders off
              </button>
            )}
          </form>
        )}

        <details className="reminders__details">
          <summary>How reminders are delivered</summary>
          <p>
            While WeatherBoard is open in a tab — even in the background — your reminder arrives at the exact time you
            choose.
          </p>
          <p>
            With the browser closed, delivery depends on your browser. If you install WeatherBoard in Chrome or Edge, the
            browser wakes it up about once a day (Periodic Background Sync). The browser chooses when, so the reminder
            may arrive later than your chosen time.
          </p>
          <p>
            Exact-time delivery with the browser closed needs a push server, which this app doesn’t have.
          </p>
        </details>
      </div>
    </section>
  )
}

function DeliveryList({ status }: { status: BackgroundStatus }) {
  const background = {
    active: { icon: Check, tone: 'ok', text: 'When the app is closed: background sync is on. Your browser picks the time, so it may arrive later.' },
    'needs-install': { icon: Info, tone: 'info', text: 'When the app is closed: install WeatherBoard (Chrome or Edge) to allow background delivery.' },
    unsupported: { icon: CircleSlash, tone: 'muted', text: 'When the browser is closed: not supported in this browser. Keep a WeatherBoard tab open.' },
    checking: { icon: Loader2, tone: 'muted', text: 'Checking background delivery…' },
  }[status]
  const BackgroundIcon = background.icon

  return (
    <ul className="reminders__delivery" aria-label="Reminder delivery">
      <li className="reminders__delivery-item reminders__delivery-item--ok">
        <Check size={15} aria-hidden />
        <span>While WeatherBoard is open: on time, every day.</span>
      </li>
      <li className={`reminders__delivery-item reminders__delivery-item--${background.tone}`}>
        <BackgroundIcon size={15} aria-hidden className={status === 'checking' ? 'spin' : undefined} />
        <span>{background.text}</span>
      </li>
    </ul>
  )
}
