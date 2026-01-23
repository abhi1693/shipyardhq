// Thin wrappers around Vercel Blob to keep imports isolated
// and provide helpful errors if not configured yet.

type PutOptions = {
  access?: "public" | "private"
  token?: string
  contentType?: string
}

export async function putBlob(
  key: string,
  data: ArrayBuffer | Blob | Buffer,
  opts: PutOptions = {},
) {
  const token = opts.token || process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      "Missing BLOB_READ_WRITE_TOKEN. Configure Vercel Blob to enable uploads.",
    )
  }

  // Dynamically import to avoid build errors if the package isn't installed yet.
  const mod = (await import("@vercel/blob")) as any
  if (!mod?.put) {
    throw new Error(
      'Vercel Blob client not available. Install "@vercel/blob" and redeploy.',
    )
  }

  const res = await mod.put(key, data, {
    access: opts.access || "public",
    token,
    contentType: opts.contentType,
    addRandomSuffix: true,
  })
  return res as {
    url: string
    pathname: string
    size: number
    contentType?: string
  }
}

export async function deleteBlob(pathname: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN")
  const mod = (await import("@vercel/blob")) as any
  if (!mod?.del) throw new Error("Vercel Blob delete not available")
  await mod.del(pathname, { token })
}

export async function deleteBlobPrefix(prefix: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN")
  const mod = (await import("@vercel/blob")) as any
  if (!mod?.list || !mod?.del)
    throw new Error("Vercel Blob list/delete not available")

  const norm = prefix.replace(/^\//, "")
  let cursor: string | undefined
  const urls: string[] = []
  do {
    const res = await mod.list({ prefix: norm, token, cursor })
    if (res?.blobs?.length) urls.push(...res.blobs.map((b: any) => b.url))
    cursor = res?.cursor
  } while (cursor)
  if (urls.length) await mod.del(urls, { token })
}
