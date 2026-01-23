const FASTAPI_PROXY_PATH = "/backend"

const getConfiguredFastApiBaseUrl = () => {
  const value = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL
  if (!value) {
    throw new Error("NEXT_PUBLIC_FASTAPI_BASE_URL is required")
  }
  return value
}

const assertAbsoluteUrl = (value: string) => {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_FASTAPI_BASE_URL must be an absolute URL")
  }
  return value
}

const normalizeBaseUrl = (value: string) =>
  value
    .replace(/\/$/, "")
    .replace(/\/backend$/, "")
    .replace(/\/api\/v1$/, "")
    .replace(/\/api$/, "")

export const getFastApiProxyTarget = () => {
  const configured = getConfiguredFastApiBaseUrl()
  return normalizeBaseUrl(assertAbsoluteUrl(configured))
}

export const getFastApiBaseUrl = () => {
  const configured = getConfiguredFastApiBaseUrl()
  if (typeof window === "undefined") {
    return normalizeBaseUrl(assertAbsoluteUrl(configured))
  }
  return `${window.location.origin}${FASTAPI_PROXY_PATH}`
}

export { FASTAPI_PROXY_PATH }
