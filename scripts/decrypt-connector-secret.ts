import { decryptConnectorSecret } from "@/lib/server/payments/connectorSecrets"
import type {
  PaymentConnectorProvider,
  PrismaClient,
} from "@/lib/vendor/prisma/client"

type EnvOptions = {
  encryptedKey?: string
  credentialId?: string
  connectorId?: string
  productId?: string
  productSlug?: string
  provider?: PaymentConnectorProvider
  includeRevoked: boolean
}

type DecryptionContext = {
  source: string
  connectorId?: string
  credentialId?: string
  provider?: PaymentConnectorProvider
  productId?: string
  productSlug?: string | null
  connectorStatus?: string
  verifiedAt?: string | null
  keyHint?: string | null
}

let prismaClient: PrismaClient | null = null

function trimmed(name: string): string | undefined {
  const value = process.env[name]
  if (!value) return undefined
  const next = value.trim()
  return next.length > 0 ? next : undefined
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

function readEnv(): EnvOptions {
  return {
    encryptedKey:
      trimmed("ENCRYPTED_CONNECTOR_KEY") ||
      trimmed("ENCRYPTED_KEY") ||
      trimmed("CONNECTOR_SECRET"),
    credentialId: trimmed("CREDENTIAL_ID"),
    connectorId: trimmed("CONNECTOR_ID"),
    productId: trimmed("PRODUCT_ID"),
    productSlug: trimmed("PRODUCT_SLUG"),
    provider: trimmed("CONNECTOR_PROVIDER") as
      | PaymentConnectorProvider
      | undefined,
    includeRevoked: parseBoolean(trimmed("INCLUDE_REVOKED")),
  }
}

async function fetchEncryptedKey(
  env: EnvOptions,
): Promise<{ encryptedKey: string; context: DecryptionContext }> {
  const [{ default: prisma }, { PaymentCredentialStatus }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/vendor/prisma/client"),
  ])
  prismaClient = prisma

  if (env.credentialId) {
    const credential = await prisma.paymentConnectorCredential.findUnique({
      where: { id: env.credentialId },
      include: {
        connector: {
          select: {
            id: true,
            provider: true,
            status: true,
            productId: true,
            verifiedAt: true,
            product: { select: { slug: true } },
          },
        },
      },
    })

    if (!credential) {
      throw new Error(`No credential found for id ${env.credentialId}`)
    }

    return {
      encryptedKey: credential.encryptedKey,
      context: {
        source: "database:credentialId",
        credentialId: credential.id,
        connectorId: credential.connector.id,
        provider: credential.connector.provider,
        productId: credential.connector.productId,
        productSlug: credential.connector.product?.slug ?? null,
        connectorStatus: credential.connector.status,
        verifiedAt: credential.connector.verifiedAt?.toISOString() ?? null,
        keyHint: credential.keyHint ?? null,
      },
    }
  }

  if (!env.connectorId && !env.productId && !env.productSlug) {
    throw new Error(
      "Provide ENCRYPTED_CONNECTOR_KEY/ENCRYPTED_KEY or one of CREDENTIAL_ID, CONNECTOR_ID, PRODUCT_ID, PRODUCT_SLUG to locate the credential",
    )
  }

  const connector = await prisma.paymentConnector.findFirst({
    where: {
      ...(env.connectorId ? { id: env.connectorId } : {}),
      ...(env.productId ? { productId: env.productId } : {}),
      ...(env.productSlug ? { product: { slug: env.productSlug } } : {}),
      ...(env.provider ? { provider: env.provider } : {}),
    },
    include: {
      product: { select: { slug: true } },
      credentials: {
        where: env.includeRevoked
          ? {}
          : { status: PaymentCredentialStatus.active },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!connector) {
    throw new Error("No connector found with the provided filters")
  }

  const credential = connector.credentials[0]
  if (!credential) {
    throw new Error(
      "Connector has no credentials that match the current filter; set INCLUDE_REVOKED=true to search all credentials",
    )
  }

  return {
    encryptedKey: credential.encryptedKey,
    context: {
      source: "database:connector",
      credentialId: credential.id,
      connectorId: connector.id,
      provider: connector.provider,
      productId: connector.productId,
      productSlug: connector.product?.slug ?? null,
      connectorStatus: connector.status,
      verifiedAt: connector.verifiedAt?.toISOString() ?? null,
      keyHint: credential.keyHint ?? null,
    },
  }
}

async function main() {
  const env = readEnv()

  if (!process.env.PAYMENT_CONNECTOR_SECRET_KEY?.trim()) {
    throw new Error(
      "PAYMENT_CONNECTOR_SECRET_KEY is required to decrypt connector API keys",
    )
  }

  let encryptedKey = env.encryptedKey
  let context: DecryptionContext = { source: "env" }

  if (!encryptedKey) {
    const lookup = await fetchEncryptedKey(env)
    encryptedKey = lookup.encryptedKey
    context = lookup.context
  }

  const apiKey = decryptConnectorSecret(encryptedKey)
  const payload = {
    ...context,
    decryptedApiKey: apiKey,
  }

  console.info(JSON.stringify(payload, null, 2))
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[decrypt-connector-secret] ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect()
    }
  })
