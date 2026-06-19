import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

type PutOptions = {
  access?: "public" | "private"
  contentType?: string
}

type R2Config = {
  accessKeyId: string
  bucket: string
  endpoint: string
  publicBaseUrl: string
  secretAccessKey: string
}

let client: S3Client | null = null

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "")
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function getR2Config(): R2Config {
  const bucket = process.env.R2_BUCKET?.trim() || "shipyard-member-images-prod"
  const rawEndpoint =
    process.env.R2_ENDPOINT?.trim() ||
    "https://492e25f5f18ef59e38763f58a78362f7.r2.cloudflarestorage.com"

  const endpoint = rawEndpoint.endsWith(`/${bucket}`)
    ? rawEndpoint.slice(0, -1 * `/${bucket}`.length)
    : rawEndpoint

  return {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    bucket,
    endpoint,
    publicBaseUrl: (
      process.env.R2_PUBLIC_BASE_URL?.trim() || "https://media.shipyardhq.dev"
    ).replace(/\/+$/g, ""),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  }
}

function getS3Client() {
  if (client) return client

  const config = getR2Config()
  client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: "auto",
  })
  return client
}

function toPublicUrl(key: string) {
  const config = getR2Config()
  return `${config.publicBaseUrl}/${trimSlashes(key)}`
}

function isMissingObjectError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "NotFound" || error.name === "NoSuchKey") {
      return true
    }
  }

  if (typeof error === "object" && error !== null && "$metadata" in error) {
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata
    return metadata?.httpStatusCode === 404
  }

  return false
}

function keyFromUrlOrPath(value: string) {
  const config = getR2Config()
  const normalized = value.trim()
  let url: URL

  try {
    url = new URL(normalized)
  } catch {
    return trimSlashes(normalized)
  }

  const publicBaseUrl = new URL(config.publicBaseUrl)
  if (url.hostname !== publicBaseUrl.hostname) {
    throw new Error(`Unsupported blob host: ${url.hostname}`)
  }

  return trimSlashes(decodeURIComponent(url.pathname))
}

export async function putBlob(
  key: string,
  data: ArrayBuffer | Blob | Buffer,
  opts: PutOptions = {},
) {
  const config = getR2Config()
  const normalizedKey = trimSlashes(key)
  const body =
    data instanceof Blob
      ? Buffer.from(await data.arrayBuffer())
      : Buffer.isBuffer(data)
        ? data
        : Buffer.from(data)

  await getS3Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: config.bucket,
      CacheControl: "public, max-age=31536000, immutable",
      ContentType: opts.contentType,
      Key: normalizedKey,
    }),
  )

  return {
    url: toPublicUrl(normalizedKey),
    pathname: normalizedKey,
    size: body.byteLength,
    contentType: opts.contentType,
  }
}

export async function blobExists(key: string) {
  const config = getR2Config()
  const normalizedKey = trimSlashes(key)
  if (!normalizedKey) return false

  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: normalizedKey,
      }),
    )
    return true
  } catch (error) {
    if (isMissingObjectError(error)) {
      return false
    }

    throw error
  }
}

export function getBlobPublicUrl(key: string) {
  return toPublicUrl(key)
}

export async function deleteBlob(pathname: string) {
  const config = getR2Config()
  const key = keyFromUrlOrPath(pathname)
  if (!key) return

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}

export async function deleteBlobPrefix(prefix: string) {
  const config = getR2Config()
  const normalizedPrefix = trimSlashes(prefix)
  let continuationToken: string | undefined

  do {
    const listed = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ContinuationToken: continuationToken,
        Prefix: normalizedPrefix,
      }),
    )

    await Promise.all(
      (listed.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key))
        .map((key) =>
          getS3Client().send(
            new DeleteObjectCommand({
              Bucket: config.bucket,
              Key: key,
            }),
          ),
        ),
    )

    continuationToken = listed.NextContinuationToken
  } while (continuationToken)
}

export function isManagedBlobUrl(value: string) {
  try {
    const url = new URL(value)
    const publicBaseUrl = new URL(getR2Config().publicBaseUrl)
    return url.hostname === publicBaseUrl.hostname
  } catch {
    return false
  }
}
