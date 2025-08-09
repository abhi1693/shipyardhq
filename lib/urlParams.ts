export type StrOrArr = string | string[] | undefined;

export function pickFirst(value: StrOrArr): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export function buildQuery(
  basePath: string,
  currentSearch: string | URLSearchParams | null | undefined,
  updates: Record<string, string | undefined | null | false>,
): string {
  const params = new URLSearchParams(
    typeof currentSearch === "string"
      ? currentSearch
      : currentSearch instanceof URLSearchParams
        ? currentSearch.toString()
        : "",
  );
  for (const [k, v] of Object.entries(updates)) {
    if (!v) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

