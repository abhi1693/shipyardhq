import { migrateLegacyMonthlyLeaderboard } from "@/lib/server/leaderboard/migrate"

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  return {
    dryRun: args.has("--dry-run") || args.has("-d"),
    overwriteExisting: args.has("--overwrite") || args.has("-o"),
  }
}

async function main() {
  const options = parseArgs()
  const summary = await migrateLegacyMonthlyLeaderboard(options)

  console.info(
    JSON.stringify(
      {
        options,
        summary,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[migrate-legacy-leaderboard] ${message}`)
  process.exitCode = 1
})
