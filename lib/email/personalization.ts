export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

function capitalize(word: string) {
  if (!word) return word
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function deriveFirstNameFromEmail(email: string): string | undefined {
  const [localPart] = email.split("@")
  if (!localPart) return undefined

  const cleaned = localPart
    .replace(/[^a-zA-Z]+/g, " ")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)

  if (cleaned.length === 0) {
    return undefined
  }

  return capitalize(cleaned[0])
}

export function parseEmailList(raw: string | null | undefined) {
  if (!raw) {
    return { valid: [] as string[], invalid: [] as string[] }
  }

  const candidates = raw
    .split(/[\n,;\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  const invalidSeen = new Set<string>()

  for (const email of candidates) {
    const normalized = email.toLowerCase()
    if (!EMAIL_PATTERN.test(email)) {
      if (!invalidSeen.has(normalized)) {
        invalid.push(email)
        invalidSeen.add(normalized)
      }
      continue
    }

    if (!seen.has(normalized)) {
      seen.add(normalized)
      valid.push(email)
    }
  }

  return { valid, invalid }
}
