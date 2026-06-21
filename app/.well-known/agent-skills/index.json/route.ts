import { AGENT_SKILLS_SCHEMA, getAgentSkills } from "@/lib/agentSkills"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "Content-Type": "application/json; charset=utf-8",
}

export function GET() {
  return Response.json(
    {
      $schema: AGENT_SKILLS_SCHEMA,
      skills: getAgentSkills(),
    },
    {
      headers,
    },
  )
}

export function HEAD() {
  return new Response(null, { headers })
}
