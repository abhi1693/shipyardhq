import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  plan: {
    findFirst: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

import { resolveRegisteredHandler } from "@/lib/server/events"
import "@/lib/server/plans"

async function runPlansHandler(payload: { productId: string }) {
  const registration = resolveRegisteredHandler(
    "product.created",
    "plans.attach-default-plan",
  )
  if (!registration) {
    throw new Error("plans.attach-default-plan handler not registered")
  }
  await registration.handler(payload as any)
}

describe("plans event listeners", () => {
  beforeEach(() => {
    prismaMock.product.findUnique.mockReset()
    prismaMock.product.update.mockReset()
    prismaMock.plan.findFirst.mockReset()
  })

  it("attaches default plan when product lacks one", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-1",
      planId: null,
    })
    prismaMock.plan.findFirst.mockResolvedValue({ id: "plan-default" })

    await runPlansHandler({ productId: "prod-1" })

    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { planId: "plan-default" },
    })
  })

  it("skips update when product already has a plan", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-2",
      planId: "existing",
    })
    prismaMock.plan.findFirst.mockResolvedValue({ id: "plan-default" })

    await runPlansHandler({ productId: "prod-2" })

    expect(prismaMock.product.update).not.toHaveBeenCalled()
  })

  it("skips update when product is missing", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)

    await runPlansHandler({ productId: "missing" })

    expect(prismaMock.product.update).not.toHaveBeenCalled()
    expect(prismaMock.plan.findFirst).not.toHaveBeenCalled()
  })

  it("logs an error when update fails but does not throw", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-3",
      planId: null,
    })
    prismaMock.plan.findFirst.mockResolvedValue({ id: "plan-default" })
    prismaMock.product.update.mockRejectedValueOnce(new Error("boom"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await runPlansHandler({ productId: "prod-3" })

    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("skips update when default plan is missing", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "prod-4",
      planId: null,
    })
    prismaMock.plan.findFirst.mockResolvedValue(null)

    await runPlansHandler({ productId: "prod-4" })

    expect(prismaMock.product.update).not.toHaveBeenCalled()
  })
})
