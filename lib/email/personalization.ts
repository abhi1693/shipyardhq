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
