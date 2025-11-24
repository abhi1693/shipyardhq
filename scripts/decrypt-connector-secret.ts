import { decryptConnectorSecret } from "@/lib/server/payments/connectorSecrets"

function readEncryptedPayload(): string {
  const [, , encryptedPayload] = process.argv
  if (!encryptedPayload?.trim()) {
    throw new Error(
      "Usage: pnpm tsx scripts/decrypt-connector-secret.ts <encrypted-connector-secret>",
    )
  }

  return encryptedPayload.trim()
}

function ensureSecretKey() {
  if (!process.env.PAYMENT_CONNECTOR_SECRET_KEY?.trim()) {
    throw new Error(
      "PAYMENT_CONNECTOR_SECRET_KEY is required to decrypt connector API keys",
    )
  }
}

async function main() {
  ensureSecretKey()

  const encryptedPayload = readEncryptedPayload()
  const decryptedApiKey = decryptConnectorSecret(encryptedPayload)

  console.info(
    JSON.stringify(
      {
        source: "arg",
        decryptedApiKey,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[decrypt-connector-secret] ${message}`)
  process.exitCode = 1
})
