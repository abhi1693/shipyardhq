export function parseKeywords(text?: string): string[] {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function uppercaseCurrency(code?: string | null): string | undefined {
  return code ? code.toUpperCase() : undefined;
}

export function sanitizeTextFields<T extends Record<string, any>>(values: T): T {
  const clone: any = { ...values };
  for (const k of ["name", "tagline", "websiteUrl", "logo", "ctaLabel", "ctaUrl"]) {
    if (typeof clone[k] === "string") clone[k] = clone[k].trim();
  }
  return clone;
}

