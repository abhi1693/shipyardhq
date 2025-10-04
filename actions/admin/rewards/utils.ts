export function parseInteger(
  value: FormDataEntryValue | null,
  fieldLabel: string,
): number | null {
  if (value == null) return null
  const str = value.toString().trim()
  if (!str.length) return null
  if (!/^-?\d+$/.test(str)) {
    throw new Error(`${fieldLabel} must be a whole number`)
  }
  const parsed = Number(str)
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${fieldLabel} must be a whole number`)
  }
  return parsed
}
