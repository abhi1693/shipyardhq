import type { PyroscopeConfig } from "@pyroscope/nodejs"

const PROFILING_STATE_KEY = Symbol.for("shipyard.metrics.profiling.state")

type ProfilingEnv = Record<string, string | undefined>
type PyroscopeApi = typeof import("@pyroscope/nodejs")["default"]

type ProfilingState = {
  heapStarted?: boolean
  pyroscope?: PyroscopeApi
  shutdownPromise?: Promise<void>
  started?: boolean
}

type ProfilingGlobal = typeof globalThis & {
  [PROFILING_STATE_KEY]?: ProfilingState
}

type ShipyardProfilingConfig = PyroscopeConfig & {
  heapEnabled: boolean
}

function state() {
  const globalState = globalThis as ProfilingGlobal
  globalState[PROFILING_STATE_KEY] ??= {}
  return globalState[PROFILING_STATE_KEY]
}

function trimmed(value: string | undefined) {
  const next = value?.trim()
  return next ? next : undefined
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return fallback

  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false

  return fallback
}

function parseResourceAttributes(value: string | undefined) {
  const attributes: Record<string, string> = {}

  for (const pair of value?.split(",") ?? []) {
    const separator = pair.indexOf("=")
    if (separator <= 0) continue

    const key = pair.slice(0, separator).trim()
    const rawValue = pair.slice(separator + 1).trim()
    if (!key || !rawValue) continue

    try {
      attributes[key] = decodeURIComponent(rawValue)
    } catch {
      attributes[key] = rawValue
    }
  }

  return attributes
}

function addTag(
  tags: Record<string, string>,
  key: string,
  value: string | undefined,
) {
  const next = trimmed(value)
  if (next) tags[key] = next
}

export function pyroscopeTags(env: ProfilingEnv = process.env) {
  const resourceAttributes = parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES)
  const tags: Record<string, string> = {}

  addTag(tags, "service_namespace", resourceAttributes["service.namespace"])
  addTag(
    tags,
    "deployment_environment",
    resourceAttributes["deployment.environment.name"] ||
      resourceAttributes["deployment.environment"] ||
      env.NODE_ENV,
  )
  addTag(
    tags,
    "service_version",
    resourceAttributes["service.version"] || env.npm_package_version,
  )
  addTag(
    tags,
    "process_role",
    env.PYROSCOPE_TAG_PROCESS_ROLE ||
      resourceAttributes["k8s.container.name"] ||
      resourceAttributes["container.name"],
  )

  return tags
}

export function pyroscopeConfig(
  env: ProfilingEnv = process.env,
): ShipyardProfilingConfig | undefined {
  const serverAddress = trimmed(env.PYROSCOPE_SERVER_ADDRESS)
  if (!serverAddress) return undefined

  return {
    appName:
      trimmed(env.PYROSCOPE_APPLICATION_NAME) ||
      trimmed(env.OTEL_SERVICE_NAME) ||
      "shipyardhq",
    flushIntervalMs: parsePositiveInteger(
      env.PYROSCOPE_FLUSH_INTERVAL_MS,
      60_000,
    ),
    heapEnabled: parseBoolean(env.PYROSCOPE_HEAP_ENABLED, false),
    serverAddress,
    tags: pyroscopeTags(env),
    wall: {
      collectCpuTime: parseBoolean(
        env.PYROSCOPE_WALL_COLLECT_CPU_TIME,
        false,
      ),
      samplingDurationMs: parsePositiveInteger(
        env.PYROSCOPE_WALL_SAMPLING_DURATION_MS,
        60_000,
      ),
      samplingIntervalMicros: parsePositiveInteger(
        env.PYROSCOPE_WALL_SAMPLING_INTERVAL_MICROS,
        10_000,
      ),
    },
  }
}

export async function registerProfiling() {
  const currentState = state()
  if (currentState.started) return

  const config = pyroscopeConfig()
  if (!config) return

  try {
    const { default: Pyroscope } = await import("@pyroscope/nodejs")
    const { heapEnabled, ...pyroscopeConfig } = config

    Pyroscope.init(pyroscopeConfig)
    Pyroscope.startWallProfiling()
    if (heapEnabled) Pyroscope.startHeapProfiling()

    currentState.pyroscope = Pyroscope
    currentState.heapStarted = heapEnabled
    currentState.started = true
    currentState.shutdownPromise = undefined

    const shutdown = () => void shutdownProfiling()
    process.once("SIGTERM", shutdown)
    process.once("SIGINT", shutdown)
  } catch (error) {
    console.error("[profiling] failed to start Pyroscope", error)
  }
}

export async function shutdownProfiling() {
  const currentState = state()
  if (!currentState.pyroscope || !currentState.started) return

  currentState.shutdownPromise ??= Promise.all([
    currentState.pyroscope.stopWallProfiling(),
    currentState.heapStarted
      ? currentState.pyroscope.stopHeapProfiling()
      : Promise.resolve(),
  ])
    .then(() => undefined)
    .catch((error) => {
      console.error("[profiling] failed to shut down Pyroscope", error)
    })
    .finally(() => {
      currentState.heapStarted = false
      currentState.pyroscope = undefined
      currentState.started = false
      currentState.shutdownPromise = undefined
    })

  await currentState.shutdownPromise
}
