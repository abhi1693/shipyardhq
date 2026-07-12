const BENEFIT_TERMS = [
  "save",
  "faster",
  "easier",
  "grow",
  "increase",
  "reduce",
  "improve",
  "help",
  "without",
  "so you can",
] as const

const ACTION_TERMS = [
  "try",
  "start",
  "discover",
  "launch",
  "create",
  "join",
  "sign up",
  "learn more",
  "get started",
] as const

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function countWholePhraseOccurrences(text: string, phrase: string) {
  const normalizedPhrase = phrase.trim().normalize("NFC")
  if (!normalizedPhrase) return 0

  const escapedPhrase = normalizedPhrase
    .split(/\s+/)
    .map(escapeRegularExpression)
    .join("\\s+")
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{M}\\p{N}])${escapedPhrase}(?![\\p{L}\\p{M}\\p{N}])`,
    "giu",
  )

  return text.normalize("NFC").match(pattern)?.length ?? 0
}

function containsWholePhrase(text: string, phrase: string) {
  return countWholePhraseOccurrences(text, phrase) > 0
}

function firstWords(value: string, maximumWords: number) {
  let wordCount = 0
  let end = value.length

  for (const match of value.matchAll(
    /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu,
  )) {
    wordCount += 1
    if (wordCount === maximumWords) {
      end = (match.index ?? 0) + match[0].length
      break
    }
  }

  return value.slice(0, end)
}

export function analyzeProductDescriptionPhrases(
  description: string,
  focusKeyword: string,
) {
  const normalizedKeyword = focusKeyword.trim()
  const opening = firstWords(description, 35)

  return {
    keywordCount: countWholePhraseOccurrences(description, normalizedKeyword),
    topicStatedEarly: Boolean(
      normalizedKeyword && containsWholePhrase(opening, normalizedKeyword),
    ),
    hasBenefit: BENEFIT_TERMS.some((term) =>
      containsWholePhrase(description, term),
    ),
    hasAction: ACTION_TERMS.some((term) =>
      containsWholePhrase(description, term),
    ),
  }
}
