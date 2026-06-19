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

export function legacyKeywordToSlug(keyword: string): string {
  const normalized = normalizeKeyword(keyword).toLowerCase()
  const base = slugify(normalized)
  const hash = keywordHash(normalized)
  return base ? `${base}-${hash}` : hash
}

export function keywordToSlug(keyword: string): string {
  const normalized = normalizeKeyword(keyword).toLowerCase()
  const base = slugify(normalized)
  return base || keywordHash(normalized)
}

export function extractKeywordHash(slug: string): string | null {
  if (!slug) return null
  const lastHyphen = slug.lastIndexOf("-")
  if (lastHyphen === -1) return null
  const hash = slug.slice(lastHyphen + 1)
  if (hash.length !== KEYWORD_SLUG_HASH_LENGTH || !HASH_HEX_REGEX.test(hash)) {
    return null
  }
  return hash.toLowerCase()
}

export function stripLegacyKeywordHash(slug: string): string {
  const hash = extractKeywordHash(slug)
  if (!hash) return slug

  const base = slug.slice(0, -(hash.length + 1))
  return base || slug
}
