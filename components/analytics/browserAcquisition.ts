import {
  ACQUISITION_COOKIE,
  acquisitionTouchFromLocation,
  normalizeAcquisitionContext,
  parseAcquisitionCookie,
  type AcquisitionContext,
  type AcquisitionTouch,
} from "@/lib/analytics/acquisition"

type Gtag = (command: string, ...args: unknown[]) => void
const SESSION_KEY = "shipyard-acquisition-visit"

export function captureBrowserAcquisition(
  gaId: string,
  gtag: Gtag,
  landing?: AcquisitionTouch,
) {
  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ACQUISITION_COOKIE}=`))
    ?.slice(ACQUISITION_COOKIE.length + 1)
  const previous = parseAcquisitionCookie(cookieValue)
  const touch =
    landing ??
    acquisitionTouchFromLocation(
      location.pathname,
      location.search,
      document.referrer,
    )
  if (!previous && !touch) return
  let context: AcquisitionContext = {
    ...(previous ?? {
      version: 1 as const,
      firstTouch: touch!,
      conversionVisit: touch,
    }),
    // A refreshed session is unknown until the tag actually returns it.
    sessionId: undefined,
    idsObservedAt: undefined,
  }
  const save = () => {
    const normalized = normalizeAcquisitionContext(context)
    if (!normalized) return
    document.cookie = `${ACQUISITION_COOKIE}=${encodeURIComponent(JSON.stringify(normalized))}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
  }
  save()
  gtag("get", gaId, "client_id", (clientId: unknown) => {
    context = {
      ...context,
      clientId: typeof clientId === "string" ? clientId : undefined,
      idsObservedAt: Date.now(),
    }
    save()
    gtag("get", gaId, "session_id", (sessionId: unknown) => {
      const id =
        typeof sessionId === "string" || typeof sessionId === "number"
          ? String(sessionId)
          : undefined
      let stored: { sessionId?: string; touch?: AcquisitionTouch } | undefined
      try {
        stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null")
      } catch {
        /* Storage can be unavailable. */
      }
      const visit = id && stored?.sessionId === id ? stored.touch : touch
      context = {
        ...context,
        sessionId: id,
        conversionVisit: visit ?? context.conversionVisit,
        idsObservedAt: Date.now(),
      }
      save()
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ sessionId: id, touch: context.conversionVisit }),
        )
      } catch {
        /* Cookie-only attribution still works. */
      }
    })
  })
}
