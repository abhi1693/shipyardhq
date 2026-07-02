export function formatTagLabel(label: string) {
  if (!label) return ""
  return label
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
