export function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined {
  if (!metadata) return undefined
  for (const key of keys) {
    const raw = metadata[key]
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim()
    }
  }
  return undefined
}
