import "dotenv/config"

import { Novu } from "@novu/api"

import { getNovuClient, isNovuEnabled } from "@/lib/server/notifications/novu"

type TopicDefinition = {
  key: string
  name: string
}

const DEFAULT_TOPICS: TopicDefinition[] = [
  {
    key: process.env.NOVU_TOPIC_WEEKLY_NEWSLETTER?.trim() || "weekly-newsletter",
    name: "Weekly Newsletter",
  },
  {
    key: process.env.NOVU_TOPIC_SYSTEM_UPDATES?.trim() || "system-updates",
    name: "System Updates",
  },
]
const SEARCH_PAGE_SIZE = 100
const SUBSCRIPTION_BATCH_SIZE = 100 // Novu caps topic subscription payloads at 100 subscriberIds

type CliArgs = {
  topics: TopicDefinition[]
  pageSize: number
}

function parseArgs(): CliArgs {
  const [, , ...rawArgs] = process.argv

  let topicKey = DEFAULT_TOPICS[0]?.key ?? "weekly-newsletter"
  let topicName = DEFAULT_TOPICS[0]?.name ?? "Weekly Newsletter"
  let pageSize = SEARCH_PAGE_SIZE
  let hasCustomTopic = false

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if ((current === "--topic" || current === "--key") && next) {
      topicKey = next
      hasCustomTopic = true
      i += 1
      continue
    }

    if (current.startsWith("--topic=") || current.startsWith("--key=")) {
      topicKey = current.split("=", 2)[1] ?? topicKey
      hasCustomTopic = true
      continue
    }

    if ((current === "--name" || current === "-n") && next) {
      topicName = next
      hasCustomTopic = true
      i += 1
      continue
    }

    if (current.startsWith("--name=")) {
      topicName = current.split("=", 2)[1] ?? topicName
      hasCustomTopic = true
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

  const normalizedKey = topicKey.trim() || DEFAULT_TOPICS[0].key
  const normalizedName = topicName.trim() || DEFAULT_TOPICS[0].name
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 500)
  const topics = hasCustomTopic
    ? [{ key: normalizedKey, name: normalizedName }]
    : DEFAULT_TOPICS

  return {
    topics,
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

  const { topics, pageSize } = parseArgs()
  const client = getNovuClient()

  for (const topic of topics) {
    await upsertTopic(client, topic.key, topic.name)
  }

  const { subscriberIds, missingEmail, deleted } = await fetchSubscriberIds(
    client,
    pageSize,
  )

  if (!subscriberIds.length) {
    console.info("[novu] no active subscribers found; nothing to subscribe")
    return
  }

  console.info(
    `[novu] subscribing ${subscriberIds.length} subscribers to topics: ${topics
      .map((topic) => topic.key)
      .join(", ")}`,
  )
  if (missingEmail > 0) {
    console.info(`[novu] ${missingEmail} subscribers are missing email values`)
  }
  if (deleted > 0) {
    console.info(`[novu] skipped ${deleted} deleted subscribers`)
  }

  for (const topic of topics) {
    console.info(
      `[novu] subscribing ${subscriberIds.length} subscribers to ${topic.key}`,
    )
    await subscribeToTopic(client, topic.key, subscriberIds)
  }

  console.info("[novu] topic backfill complete")
}

main().catch((error) => {
  console.error("[novu] topic backfill failed", error)
  process.exitCode = 1
})
