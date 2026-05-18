import prisma from "@/lib/prisma"
import { putBlob } from "@/lib/blob"

const SOURCE_HOST_PATTERN = "vercel-storage.com"

type Args = {
  concurrency: number
  limit?: number
  write: boolean
}

type MediaReference =
  | {
      kind: "product-logo"
      id: string
      url: string
    }
  | {
      kind: "product-banner"
      id: string
      url: string
    }
  | {
      kind: "product-media"
      id: string
      url: string
    }

function parseArgs(): Args {
  const [, , ...rawArgs] = process.argv
  const args: Args = { concurrency: 5, write: false }

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if (current === "--write") {
      args.write = true
      continue
    }

    if (current === "--limit" && next) {
      args.limit = Number(next)
      i += 1
      continue
    }

    if (current === "--concurrency" && next) {
      args.concurrency = Number(next)
      i += 1
      continue
    }

    if (current.startsWith("--concurrency=")) {
      args.concurrency = Number(current.replace("--concurrency=", ""))
      continue
    }

    if (current.startsWith("--limit=")) {
      args.limit = Number(current.replace("--limit=", ""))
      continue
    }

    if (current === "-h" || current === "--help") {
      console.info(
        [
          "Usage: npm run media:migrate-r2 -- [--write] [--limit N] [--concurrency N]",
          "",
          "Dry-run is the default. Set DATABASE_URL or DIRECT_DATABASE_URL,",
          "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and optionally R2_BUCKET,",
          "R2_ENDPOINT, R2_PUBLIC_BASE_URL.",
        ].join("\n"),
      )
      process.exit(0)
    }
  }

  if (args.limit !== undefined && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive number")
  }

  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    throw new Error("--concurrency must be a positive number")
  }

  return args
}

function keyFromVercelUrl(url: string) {
  const parsed = new URL(url)
  if (!parsed.hostname.includes(SOURCE_HOST_PATTERN)) {
    throw new Error(`Unsupported source host: ${parsed.hostname}`)
  }

  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""))
}

function publicR2Url(key: string) {
  const baseUrl = (
    process.env.R2_PUBLIC_BASE_URL?.trim() || "https://media.shipyardhq.dev"
  ).replace(/\/+$/g, "")
  return `${baseUrl}/${key.replace(/^\/+/, "")}`
}

async function collectReferences(limit?: number): Promise<MediaReference[]> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { logo: { contains: SOURCE_HOST_PATTERN } },
        { bannerImage: { contains: SOURCE_HOST_PATTERN } },
      ],
    },
    select: {
      id: true,
      logo: true,
      bannerImage: true,
    },
    take: limit,
  })

  const remainingLimit =
    limit === undefined ? undefined : Math.max(0, limit - products.length)

  const media = await prisma.productMedia.findMany({
    where: {
      imageUrl: { contains: SOURCE_HOST_PATTERN },
    },
    select: {
      id: true,
      imageUrl: true,
    },
    take: remainingLimit,
  })

  const refs: MediaReference[] = []
  for (const product of products) {
    if (product.logo.includes(SOURCE_HOST_PATTERN)) {
      refs.push({ kind: "product-logo", id: product.id, url: product.logo })
    }

    if (product.bannerImage?.includes(SOURCE_HOST_PATTERN)) {
      refs.push({
        kind: "product-banner",
        id: product.id,
        url: product.bannerImage,
      })
    }
  }

  for (const item of media) {
    refs.push({ kind: "product-media", id: item.id, url: item.imageUrl })
  }

  return limit === undefined ? refs : refs.slice(0, limit)
}

async function copyUrl(url: string) {
  const key = keyFromVercelUrl(url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get("content-type") ?? undefined
  const buffer = Buffer.from(await response.arrayBuffer())
  const uploaded = await putBlob(key, buffer, { access: "public", contentType })

  return {
    key,
    nextUrl: uploaded.url || publicR2Url(key),
  }
}

async function updateReference(reference: MediaReference, nextUrl: string) {
  if (reference.kind === "product-logo") {
    await prisma.product.update({
      where: { id: reference.id },
      data: { logo: nextUrl },
    })
    return
  }

  if (reference.kind === "product-banner") {
    await prisma.product.update({
      where: { id: reference.id },
      data: { bannerImage: nextUrl },
    })
    return
  }

  await prisma.productMedia.update({
    where: { id: reference.id },
    data: { imageUrl: nextUrl },
  })
}

async function runLimited<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
) {
  let nextIndex = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex]
        nextIndex += 1
        await handler(item)
      }
    },
  )

  await Promise.all(workers)
}

async function main() {
  const args = parseArgs()
  const references = await collectReferences(args.limit)
  const uniqueUrls = new Map<string, MediaReference[]>()

  for (const reference of references) {
    const matches = uniqueUrls.get(reference.url) ?? []
    matches.push(reference)
    uniqueUrls.set(reference.url, matches)
  }

  console.info(
    `[media:migrate-r2] found ${references.length} references across ${uniqueUrls.size} objects`,
  )

  if (!args.write) {
    for (const [url, refs] of uniqueUrls) {
      console.info(
        `[dry-run] ${refs.length} reference(s): ${url} -> ${publicR2Url(keyFromVercelUrl(url))}`,
      )
    }
    console.info("[dry-run] rerun with --write to copy objects and update database rows")
    return
  }

  let copied = 0
  let updated = 0
  const failures: Array<{ error: string; url: string }> = []

  await runLimited(
    Array.from(uniqueUrls.entries()),
    args.concurrency,
    async ([url, refs]) => {
      try {
        const { key, nextUrl } = await copyUrl(url)
        copied += 1
        console.info(`[copy] ${key}`)

        for (const reference of refs) {
          await updateReference(reference, nextUrl)
          updated += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push({ error: message, url })
        console.warn(`[skip] ${message}`)
      }
    },
  )

  console.info(
    `[media:migrate-r2] copied ${copied} object(s), updated ${updated} row(s), failed ${failures.length} object(s)`,
  )

  if (failures.length) {
    console.info("[media:migrate-r2] failed URLs:")
    for (const failure of failures) {
      console.info(`- ${failure.url}`)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
