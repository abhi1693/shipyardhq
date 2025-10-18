const EMAIL_SPLIT_REGEX = /[\s,;]+/
const EMAIL_EXTRACT_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const EMAIL_VALIDATE_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

function sanitizeToken(token: string): string {
  const trimmed = token.trim()
  if (!trimmed) return ""

  const cleaned = trimmed.replace(/^["'<(`\[]+/, "").replace(/["'>)\]]+$/, "")

  if (cleaned.includes("<") || cleaned.includes(">")) {
    const match = cleaned.match(EMAIL_EXTRACT_REGEX)
    return match ? match[0] : cleaned
  }

  return cleaned
}

function isValidEmail(email: string): boolean {
  return EMAIL_VALIDATE_REGEX.test(email)
}

export type ParsedEmailList = {
  valid: string[]
  invalid: string[]
}

export function parseEmailList(raw: string): ParsedEmailList {
  if (!raw.trim()) {
    return { valid: [], invalid: [] }
  }

  const tokens = raw
    .split(EMAIL_SPLIT_REGEX)
    .map((token) => sanitizeToken(token))
    .filter(Boolean)

  const deduplicated = new Map<string, string>()
  for (const token of tokens) {
    const normalized = token.toLowerCase()
    if (!deduplicated.has(normalized)) {
      deduplicated.set(normalized, token)
    }
  }

  const valid: string[] = []
  const invalid: string[] = []

  for (const token of deduplicated.values()) {
    if (isValidEmail(token)) {
      valid.push(token)
    } else {
      invalid.push(token)
    }
  }

  return { valid, invalid }
}

export function validateSingleEmail(email: string): boolean {
  return isValidEmail(email.trim())
}
