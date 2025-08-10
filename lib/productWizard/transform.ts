export function parseKeywords(text?: string): string[] {
  if (!text) return [];
  const set = new Set(
    text
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return Array.from(set);
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

export function normalizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const s = url.trim();
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function coercePricing(values: Record<string, any>) {
  const v = { ...values } as any;
  const pm = v.pricingModel;
  if (pm === "free" || pm === "custom") {
    v.startingPriceCents = undefined;
    v.currencyCode = undefined;
  }
  return v;
}
