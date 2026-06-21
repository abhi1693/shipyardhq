import { buildShipyardDiscoverySkill } from "@/lib/agentSkills"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "Content-Type": "text/markdown; charset=utf-8",
}

export function GET() {
  return new Response(buildShipyardDiscoverySkill(), { headers })
}

export function HEAD() {
  return new Response(null, { headers })
}
