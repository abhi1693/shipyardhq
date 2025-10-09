import { createHash } from "crypto"

import { slugify } from "@/lib/utils"

export const KEYWORD_SLUG_HASH_LENGTH = 6

const HASH_HEX_REGEX = /^[a-f0-9]+$/i

export function normalizeKeyword(keyword: string): string {
  return keyword.trim()
}

function keywordHash(normalizedKeyword: string): string {
  return createHash("md5")
    .update(normalizedKeyword)
    .digest("hex")
    .slice(0, KEYWORD_SLUG_HASH_LENGTH)
}

export function keywordToSlug(keyword: string): string {
  const normalized = normalizeKeyword(keyword).toLowerCase()
  const base = slugify(normalized)
  const hash = keywordHash(normalized)
  return base ? `${base}-${hash}` : hash
}

export function matchKeywordBySlug<T extends { keyword: string }>(
  entries: T[],
  slug: string,
): T | undefined {
  return entries.find((entry) => keywordToSlug(entry.keyword) === slug)
}

export function normalizedKeywordHash(normalizedKeyword: string): string {
  return keywordHash(normalizedKeyword)
}

export function extractKeywordHash(slug: string): string | null {
  if (!slug) return null
  const lastHyphen = slug.lastIndexOf("-")
  if (lastHyphen === -1) return null
  const hash = slug.slice(lastHyphen + 1)
  if (
    hash.length !== KEYWORD_SLUG_HASH_LENGTH ||
    !HASH_HEX_REGEX.test(hash)
  ) {
    return null
  }
  return hash.toLowerCase()
}
