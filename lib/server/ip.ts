import { headers } from "next/headers"

export async function getClientIp(): Promise<string> {
  try {
    const hdrs = await headers()
    const xff = hdrs.get("x-forwarded-for") || hdrs.get("X-Forwarded-For")
    if (xff) {
      // X-Forwarded-For may contain multiple addresses
      const ip = xff.split(",")[0]?.trim()
      if (ip) return ip
    }
    const real = hdrs.get("x-real-ip") || hdrs.get("X-Real-IP")
    if (real) return real
    const cf = hdrs.get("cf-connecting-ip") || hdrs.get("CF-Connecting-IP")
    if (cf) return cf
  } catch {}
  return "0.0.0.0"
}
