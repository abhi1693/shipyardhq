type StaticParam = Record<string, string>

export async function safelyReadStaticParams<T extends StaticParam>(
  label: string,
  read: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await read()
  } catch (error) {
    console.warn(`[static-params] failed to read ${label}`, { error })
    return []
  }
}
