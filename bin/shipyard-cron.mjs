#!/usr/bin/env node

const commands = new Map([
  [
    "events:drain",
    {
      route: "../.next/server/app/api/cron/events/drain/[queue]/route.js",
      buildRequest: ({ queue }) => ({
        url: `http://shipyardhq.local/api/cron/events/drain/${queue}`,
        params: { queue },
      }),
    },
  ],
])

function usage() {
  return [
    "Usage:",
    "  node bin/shipyard-cron.mjs events:drain --queue <high|default|low>",
  ].join("\n")
}

function readOption(args, name) {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1]
}

async function loadGetHandler(routePath) {
  const moduleUrl = new URL(routePath, import.meta.url)
  const mod = await import(moduleUrl.href)
  const routeModule = await mod.default
  const handler = routeModule?.routeModule?.userland?.GET ?? mod.GET

  if (typeof handler !== "function") {
    throw new Error(`GET handler not found for ${routePath}`)
  }

  return handler
}

async function main() {
  const [commandName, ...args] = process.argv.slice(2)
  const command = commands.get(commandName)

  if (!command) {
    console.error(usage())
    process.exit(2)
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    throw new Error("CRON_SECRET must be set")
  }

  process.env.SHIPYARD_DISABLE_STARTUP_JOBS = "1"

  const queue = readOption(args, "--queue")
  const { url, params } = command.buildRequest({ queue })
  const handler = await loadGetHandler(command.route)
  const response = await handler(
    new Request(url, {
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
    }),
    { params: Promise.resolve(params) },
  )

  const body = await response.text()
  if (body) {
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2))
    } catch {
      console.log(body)
    }
  }

  if (!response.ok) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
