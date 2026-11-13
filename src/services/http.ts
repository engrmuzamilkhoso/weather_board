export type ApiErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'unauthorized'
  | 'not-found'
  | 'server'
  | 'invalid-response'
  | 'missing-key'

/**
 * Typed failure for every outbound request. The `kind` lets the UI show a
 * specific message ("rate limit reached", "you're offline", …) instead of a
 * generic "Something went wrong".
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly retryAfterMs: number | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

export function abortError(): DOMException {
  return new DOMException('The request was cancelled.', 'AbortError')
}

interface FetchJsonOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  timeoutMs?: number
  /** Human name used in error messages, e.g. "OpenWeatherMap". */
  service: string
}

/**
 * fetch + JSON with: caller cancellation (AbortController), a timeout, and
 * HTTP status → ApiError mapping. Returns `unknown` on purpose — each caller
 * validates the shape it expects before trusting it.
 */
export async function fetchJson(url: string, { signal, headers, timeoutMs = 10_000, service }: FetchJsonOptions): Promise<unknown> {
  if (signal?.aborted) throw abortError()
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', `You're offline, so ${service} can't be reached.`)
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  let response: Response
  try {
    response = await fetch(url, { headers, signal: controller.signal })
  } catch (error) {
    if (signal?.aborted) throw abortError()
    if (timedOut) throw new ApiError('timeout', `${service} took too long to respond.`)
    if (isAbortError(error)) throw abortError()
    throw new ApiError('network', `Couldn't connect to ${service}. Check your internet connection.`)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }

  if (!response.ok) throw await errorFromResponse(response, service)

  try {
    return await response.json()
  } catch {
    throw new ApiError('invalid-response', `${service} returned a response we couldn't read.`, response.status)
  }
}

async function errorFromResponse(response: Response, service: string): Promise<ApiError> {
  const { status } = response
  if (status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    return new ApiError(
      'rate-limit',
      `${service} rate limit reached.`,
      status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
    )
  }
  if (status === 401 || status === 403) {
    return new ApiError('unauthorized', `${service} rejected the API key.`, status)
  }
  if (status === 404) return new ApiError('not-found', `${service} has no data for this request.`, status)
  return new ApiError('server', `${service} is having problems (HTTP ${status}).`, status)
}

/** Resolves after `ms`, rejecting early with AbortError if the signal fires. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
