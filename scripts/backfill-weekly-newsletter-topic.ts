import "dotenv/config"

import { Novu } from "@novu/api"

import { getNovuClient, isNovuEnabled } from "@/lib/server/notifications/novu"

const DEFAULT_TOPIC_KEY =
  process.env.NOVU_TOPIC_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter"
const DEFAULT_TOPIC_NAME = "Weekly Newsletter"
const SEARCH_PAGE_SIZE = 100
const SUBSCRIPTION_BATCH_SIZE = 100 // Novu caps topic subscription payloads at 100 subscriberIds

type CliArgs = {
  topicKey: string
  topicName: string
  pageSize: number
}

function parseArgs(): CliArgs {
  const [, , ...rawArgs] = process.argv

  let topicKey = DEFAULT_TOPIC_KEY
  let topicName = DEFAULT_TOPIC_NAME
  let pageSize = SEARCH_PAGE_SIZE

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if ((current === "--topic" || current === "--key") && next) {
      topicKey = next
      i += 1
      continue
    }

    if (current.startsWith("--topic=") || current.startsWith("--key=")) {
      topicKey = current.split("=", 2)[1] ?? topicKey
      continue
    }

    if ((current === "--name" || current === "-n") && next) {
      topicName = next
      i += 1
      continue
    }

    if (current.startsWith("--name=")) {
      topicName = current.split("=", 2)[1] ?? topicName
      continue
    }

    if (current === "--page-size" && next) {
      const parsed = Number.parseInt(next, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        pageSize = parsed
      }
      i += 1
      continue
    }

    if (current.startsWith("--page-size=")) {
      const parsed = Number.parseInt(current.split("=", 2)[1] ?? "", 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        pageSize = parsed
      }
      continue
    }
  }

  const normalizedKey = topicKey.trim() || DEFAULT_TOPIC_KEY
  const normalizedName = topicName.trim() || DEFAULT_TOPIC_NAME
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 500)

  return {
    topicKey: normalizedKey,
    topicName: normalizedName,
    pageSize: normalizedPageSize,
  }
}

async function upsertTopic(client: Novu, key: string, name: string) {
  const response = await client.topics.create({ key, name })
  console.info(
    `[novu] topic ready: ${response.result?.key ?? key} (${response.result?.name ?? name})`,
  )
}

async function fetchSubscriberIds(client: Novu, pageSize: number) {
  const subscriberIds = new Set<string>()
  let cursor: string | undefined
  let page = 0
  let missingEmail = 0
  let deleted = 0

  do {
    const result = await client.subscribers.search({
      limit: pageSize,
      after: cursor,
    })

    const data = result.result?.data ?? []
    page += 1
    console.info(`[novu] fetched page ${page} (${data.length} subscribers)`)

    for (const subscriber of data) {
      const id = subscriber.subscriberId?.trim()
      if (!id) continue
      if (subscriber.deleted) {
        deleted += 1
        continue
      }

      subscriberIds.add(id)
      if (!subscriber.email?.trim()) {
        missingEmail += 1
      }
    }

    cursor = result.result?.next ?? undefined
  } while (cursor)

  return {
    subscriberIds: Array.from(subscriberIds),
    missingEmail,
    deleted,
  }
}

function chunk<T>(input: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < input.length; i += size) {
    batches.push(input.slice(i, i + size))
  }
  return batches
}

async function subscribeToTopic(
  client: Novu,
  topicKey: string,
  subscriberIds: string[],
) {
  let processed = 0
  for (const batch of chunk(subscriberIds, SUBSCRIPTION_BATCH_SIZE)) {
    await client.topics.subscriptions.create({ subscriberIds: batch }, topicKey)
    processed += batch.length
    console.info(
      `[novu] subscribed ${processed}/${subscriberIds.length} to ${topicKey}`,
    )
  }
}

async function main() {
  if (!isNovuEnabled()) {
    throw new Error("NOVU_SECRET_KEY is required to create topics")
  }

  const { topicKey, topicName, pageSize } = parseArgs()
  const client = getNovuClient()

  await upsertTopic(client, topicKey, topicName)

  const { subscriberIds, missingEmail, deleted } = await fetchSubscriberIds(
    client,
    pageSize,
  )

  if (!subscriberIds.length) {
    console.info("[novu] no active subscribers found; nothing to subscribe")
    return
  }

  console.info(
    `[novu] subscribing ${subscriberIds.length} subscribers to ${topicKey}`,
  )
  if (missingEmail > 0) {
    console.info(`[novu] ${missingEmail} subscribers are missing email values`)
  }
  if (deleted > 0) {
    console.info(`[novu] skipped ${deleted} deleted subscribers`)
  }

  await subscribeToTopic(client, topicKey, subscriberIds)

  console.info("[novu] topic backfill complete")
}

main().catch((error) => {
  console.error("[novu] weekly newsletter topic backfill failed", error)
  process.exitCode = 1
})
