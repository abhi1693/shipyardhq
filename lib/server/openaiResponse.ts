export function extractAssistantJson(response: any): string {
  if (!response?.output) return ""
  for (const item of response.output) {
    if (item?.type === "message") {
      for (const content of item.content ?? []) {
        if (content?.type === "output_text") {
          if (typeof content.text === "string") return content.text
          if (typeof content.text?.value === "string") return content.text.value
        }
        if (
          content?.type === "text" &&
          typeof content.text?.value === "string"
        ) {
          return content.text.value
        }
      }
    }
  }
  const outputText = (response as any)?.output_text
  if (typeof outputText === "string") return outputText
  if (Array.isArray(outputText)) {
    return outputText.join("\n")
  }
  return ""
}

export function coerceJsonText(raw: string): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()
  return withoutFence.replace(/\u0000/g, "").trim()
}
