import { describe, expect, it, vi } from "vitest"
import {
  recordFirstPublication,
  recordLaunchLifecycle,
} from "@/lib/server/analytics/launchLifecycle"
import type { Prisma } from "@/lib/vendor/prisma/client"

function fixture(legacy = false) {
  const rows = new Map<string, unknown>()
  const tx = {
    user: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          acquisitionContext: {
            version: 1,
            firstTouch: {
              path: "/guides",
              source: "google",
              observedAt: Date.now(),
            },
          },
        }),
    },
    launchLifecycleEvent: {
      findUnique: vi.fn().mockResolvedValue(legacy ? { key: "legacy" } : null),
      createMany: vi.fn(async ({ data }: { data: { key: string }[] }) => {
        for (const row of data) if (!rows.has(row.key)) rows.set(row.key, row)
        return { count: rows.size }
      }),
    },
  } as unknown as Prisma.TransactionClient
  return { tx, rows }
}
describe("durable launch lifecycle", () => {
  it("keeps saved draft, completed private record and actual publication distinct", async () => {
    const { tx, rows } = fixture()
    await recordLaunchLifecycle(tx, {
      userId: "u",
      entityId: "draft",
      kind: "submission_started",
    })
    await recordLaunchLifecycle(tx, {
      userId: "u",
      entityId: "p",
      kind: "submission_completed",
    })
    expect(rows.has("first_published:p")).toBe(false)
    await recordFirstPublication(
      tx,
      { id: "p", userId: "u", publishedAt: null },
      new Date(),
    )
    expect([...rows.keys()]).toEqual([
      "submission_started:draft",
      "submission_completed:p",
      "first_published:p",
    ])
    expect(rows.get("first_published:p")).toMatchObject({
      acquisitionContext: { firstTouch: { source: "google", path: "/guides" } },
    })
  })
  it("deduplicates retries and never fabricates a new publication for legacy history", async () => {
    const { tx, rows } = fixture()
    await Promise.all(
      Array.from({ length: 4 }, () =>
        recordFirstPublication(
          tx,
          { id: "p", userId: "u", publishedAt: null },
          new Date(),
        ),
      ),
    )
    expect(rows.size).toBe(1)
    await recordFirstPublication(
      tx,
      { id: "older", userId: "u", publishedAt: new Date("2025-01-01") },
      new Date(),
    )
    expect(rows.size).toBe(1)
    const legacy = fixture(true)
    await recordFirstPublication(
      legacy.tx,
      { id: "oldDraft", userId: "u", publishedAt: null },
      new Date(),
    )
    expect(legacy.rows.size).toBe(0)
  })
})
