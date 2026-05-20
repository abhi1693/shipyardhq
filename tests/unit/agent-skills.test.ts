import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  AGENT_SKILLS_SCHEMA,
  buildShipyardDiscoverySkill,
  getAgentSkills,
  SHIPYARD_DISCOVERY_SKILL_NAME,
} from "@/lib/agentSkills"

describe("agent skills discovery", () => {
  it("publishes a v0.2.0 skill-md entry with a matching sha256 digest", () => {
    const skill = buildShipyardDiscoverySkill()
    const [entry] = getAgentSkills()
    const digest = createHash("sha256").update(skill).digest("hex")

    expect(AGENT_SKILLS_SCHEMA).toBe(
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    )
    expect(entry).toMatchObject({
      name: SHIPYARD_DISCOVERY_SKILL_NAME,
      type: "skill-md",
      url: `/.well-known/agent-skills/${SHIPYARD_DISCOVERY_SKILL_NAME}/SKILL.md`,
      digest: `sha256:${digest}`,
    })
    expect(entry.description.length).toBeGreaterThan(0)
    expect(skill).toContain(`name: ${SHIPYARD_DISCOVERY_SKILL_NAME}`)
  })
})
