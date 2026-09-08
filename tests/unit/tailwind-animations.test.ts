// @vitest-environment node

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { describe, expect, it } from "vitest"

describe("shared UI animation CSS", () => {
  it.each([
    "app/(public)/browse.css",
    "app/(auth)/auth.css",
    "app/(member)/member/member.css",
  ])("compiles state animations in %s", async (entrypoint) => {
    const from = resolve(entrypoint)
    const result = await postcss([tailwindcss({ optimize: false })]).process(
      await readFile(from, "utf8"),
      { from },
    )
    const animations = new Set<string>()
    result.root.walkRules((rule) => {
      if (!rule.selector.includes("data-") || !rule.selector.includes("state"))
        return
      rule.walkDecls("animation-name", (declaration) => {
        animations.add(declaration.value)
      })
      rule.walkDecls("animation", (declaration) => {
        animations.add(declaration.value)
      })
    })

    expect(animations).toEqual(
      new Set([
        "enter",
        "exit",
        "accordion-down 0.2s ease-out",
        "accordion-up 0.2s ease-out",
      ]),
    )
    expect(result.css).not.toContain("@utility")
    expect(result.warnings()).toHaveLength(0)
  })
})
