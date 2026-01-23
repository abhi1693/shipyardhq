import { getFastApiBaseUrl, readResponseJson } from "@/lib/fastapi"

export type FastApiError = Error & {
  info?: unknown
  status?: number
}

type AuthTokenProvider = (options?: {
  skipCache?: boolean
}) => Promise<string | null>

let authTokenProvider: AuthTokenProvider | null = null
let lastMaintenanceToastAt = 0

const MAINTENANCE_STATUS_CODE = 503
const MAINTENANCE_TOAST_INTERVAL_MS = 30000

export const setFastApiAuthTokenProvider = (
  provider: AuthTokenProvider | null,
) => {
  authTokenProvider = provider
}

const buildUrl = (baseUrl: string, path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }
  if (path.startsWith("/")) {
    return `${baseUrl}${path}`
  }
  return `${baseUrl}/${path}`
}

const resolveHeaders = async (
  options: RequestInit,
  { skipCache }: { skipCache: boolean },
) => {
  const headers = new Headers(options.headers)
  if (authTokenProvider) {
    const token = await authTokenProvider({ skipCache })
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }
  return headers
}

const isAuthErrorStatus = (status: number) => status === 401 || status === 403

const notifyMaintenance = () => {
  if (typeof window === "undefined") {
    return
  }
  const now = Date.now()
  if (now - lastMaintenanceToastAt < MAINTENANCE_TOAST_INTERVAL_MS) {
    return
  }
  lastMaintenanceToastAt = now
  import("sonner")
    .then(({ toast }) => {
      toast.error("Maintenance in progress. Please try again soon.")
    })
    .catch(() => undefined)
}

export const fastapiFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const baseUrl = getFastApiBaseUrl()
  const fullUrl = buildUrl(baseUrl, url)
  const baseOptions = {
    ...options,
    cache: options.cache ?? "no-store",
  }
  const headers = await resolveHeaders(baseOptions, { skipCache: false })
  const executeFetch = (requestHeaders: Headers) =>
    fetch(fullUrl, {
      ...baseOptions,
      headers: requestHeaders,
    })
  let response = await executeFetch(headers)

  if (authTokenProvider && isAuthErrorStatus(response.status)) {
    const refreshedHeaders = await resolveHeaders(baseOptions, {
      skipCache: true,
    })
    const initialAuth = headers.get("Authorization")
    const refreshedAuth = refreshedHeaders.get("Authorization")
    if (refreshedAuth && refreshedAuth !== initialAuth) {
      response = await executeFetch(refreshedHeaders)
    }
  }

  if (response.status === MAINTENANCE_STATUS_CODE) {
    notifyMaintenance()
  }

  const data = await readResponseJson<unknown>(response)
  const payload = {
    data,
    status: response.status,
    headers: response.headers,
  } as T
  if (!response.ok) {
    const error = new Error("Request failed.") as FastApiError
    error.info = data
    error.status = response.status
    throw error
  }

  return payload
}
