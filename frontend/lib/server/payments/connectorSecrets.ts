import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ENCRYPTION_VERSION = 1
const SECRET_ENV_KEY = "PAYMENT_CONNECTOR_SECRET_KEY"

type ParsedSecret = {
  version: number
  iv: Buffer
  ciphertext: Buffer
  authTag: Buffer
}

function getConnectorSecretKey(): Buffer {
  const raw = process.env[SECRET_ENV_KEY]?.trim()
  if (!raw) {
    throw new Error(
      `${SECRET_ENV_KEY} is required to encrypt payment connector credentials`,
    )
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const key = Buffer.from(raw, "hex")
    if (key.length === 32) return key
  }

  try {
    const buf = Buffer.from(raw, "base64")
    if (buf.length === 32) return buf
  } catch {
    // ignore and fall through
  }

  if (raw.length === 32) {
    return Buffer.from(raw)
  }

  throw new Error(
    `${SECRET_ENV_KEY} must be a 32-byte key (hex, base64, or 32-character string)`,
  )
}

function serializeSecret(parts: ParsedSecret): string {
  return [
    `v${parts.version}`,
    parts.iv.toString("base64"),
    parts.ciphertext.toString("base64"),
    parts.authTag.toString("base64"),
  ].join(":")
}

function parseSecret(payload: string): ParsedSecret {
  const segments = payload.split(":")
  if (segments.length !== 4) {
    throw new Error("Malformed connector secret payload")
  }

  const [versionPart, ivB64, cipherB64, tagB64] = segments
  const version = Number(versionPart.replace(/^v/, ""))
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Unsupported connector secret version")
  }

  return {
    version,
    iv: Buffer.from(ivB64, "base64"),
    ciphertext: Buffer.from(cipherB64, "base64"),
    authTag: Buffer.from(tagB64, "base64"),
  }
}

export function encryptConnectorSecret(secret: string): string {
  const key = getConnectorSecretKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return serializeSecret({
    version: ENCRYPTION_VERSION,
    iv,
    ciphertext,
    authTag,
  })
}

export function decryptConnectorSecret(payload: string): string {
  const key = getConnectorSecretKey()
  const parsed = parseSecret(payload)
  const decipher = createDecipheriv("aes-256-gcm", key, parsed.iv)
  decipher.setAuthTag(parsed.authTag)
  const decrypted = Buffer.concat([
    decipher.update(parsed.ciphertext),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}

export function buildConnectorKeyHint(secret: string): string | undefined {
  if (!secret) return undefined
  const trimmed = secret.trim()
  if (trimmed.length <= 4) return trimmed
  return trimmed.slice(-4)
}
