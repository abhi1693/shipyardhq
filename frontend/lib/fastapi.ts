export { getFastApiBaseUrl } from "./fastapi-config"

type ClerkExternalAccountLike = {
  provider?: string
  externalId?: string
  providerUserId?: string
  id?: string
  username?: string | null
}

type ClerkUserLike = {
  id: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  imageUrl?: string | null
  externalAccounts?: ClerkExternalAccountLike[] | null
} | null

export type ClerkExternalAccountPayload = {
  provider: string
  externalId: string
  username?: string | null
}

export type ClerkProfilePayload = {
  id: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  imageUrl?: string | null
  externalAccounts?: ClerkExternalAccountPayload[] | null
}

const normalizeExternalAccount = (
  account: ClerkExternalAccountLike,
): ClerkExternalAccountPayload | null => {
  const provider =
    typeof account.provider === "string" ? account.provider : null
  const externalId =
    typeof account.externalId === "string"
      ? account.externalId
      : typeof account.providerUserId === "string"
        ? account.providerUserId
        : typeof account.id === "string"
          ? account.id
          : null

  if (!provider || !externalId) {
    return null
  }

  return {
    provider,
    externalId,
    username: account.username ?? null,
  }
}

export const buildClerkProfilePayload = (
  user: ClerkUserLike,
  fallbackId: string,
): ClerkProfilePayload => {
  if (!user) {
    return { id: fallbackId }
  }

  const externalAccounts = Array.isArray(user.externalAccounts)
    ? user.externalAccounts
        .map(normalizeExternalAccount)
        .filter(
          (account): account is ClerkExternalAccountPayload => account !== null,
        )
    : null

  return {
    id: user.id,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    fullName: user.fullName ?? null,
    imageUrl: user.imageUrl ?? null,
    externalAccounts: externalAccounts?.length ? externalAccounts : null,
  }
}

export const readResponseJson = async <T>(
  response: Response,
): Promise<T | null> => {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const resolveApiError = (payload: unknown, fallback: string) => {
  const normalized = (() => {
    if (!payload) {
      return null
    }
    if (typeof payload !== "object") {
      return payload
    }
    if ("info" in payload) {
      const info = (payload as { info?: unknown }).info
      return info ?? payload
    }
    if ("data" in payload) {
      const data = (payload as { data?: unknown }).data
      return data ?? payload
    }
    return payload
  })()

  if (!normalized) {
    return fallback
  }

  if (typeof normalized === "string") {
    return normalized
  }

  if (typeof normalized !== "object") {
    return fallback
  }

  if ("error" in normalized && typeof normalized.error === "string") {
    return normalized.error
  }

  if ("message" in normalized && typeof normalized.message === "string") {
    return normalized.message
  }

  if ("detail" in normalized) {
    const detail = (normalized as { detail?: unknown }).detail
    if (typeof detail === "string") {
      return detail
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (
        first &&
        typeof first === "object" &&
        "msg" in first &&
        typeof (first as { msg?: unknown }).msg === "string"
      ) {
        return (first as { msg: string }).msg
      }
    }
  }

  return fallback
}
