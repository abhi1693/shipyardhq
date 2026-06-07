import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { getAppBaseUrl } from "@/lib/app-url"

export type HomepageRefreshResult = Awaited<
  ReturnType<typeof refreshHomepageFeedCache>
>

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || null
}

function getHomepageRefreshUrl() {
  return new URL("/api/homepage/refresh", getAppBaseUrl()).toString()
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null)
  }

  return response.text().catch(() => "")
}

async function refreshHomepageFeedCacheDirectlyFromWorker(
  reason: string,
  cause: string,
) {
  console.warn("[homepage.worker-refresh] using direct refresh fallback", {
    reason,
    cause,
  })
  return refreshHomepageFeedCache({
    revalidateNextCache: false,
    useNextLaunchCache: false,
  })
}

export async function refreshHomepageFeedCacheFromWorker(
  reason = "worker",
): Promise<HomepageRefreshResult> {
  const secret = getCronSecret()
  if (!secret) {
    return refreshHomepageFeedCacheDirectlyFromWorker(
      reason,
      "worker CRON_SECRET missing",
    )
  }

  const url = getHomepageRefreshUrl()
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ reason }),
  })

  const body = await readResponseBody(response)
  if (!response.ok) {
    if (response.status === 503) {
      return refreshHomepageFeedCacheDirectlyFromWorker(
        reason,
        "Next refresh endpoint is not configured",
      )
    }

    throw new Error(
      `[homepage.worker-refresh] failed via Next endpoint: ${response.status} ${response.statusText} ${JSON.stringify(body)}`,
    )
  }

  return body as HomepageRefreshResult
}
