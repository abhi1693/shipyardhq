import { beforeEach, describe, expect, it, vi } from "vitest"

const sendEmailMock = vi.hoisted(() => vi.fn())
const getAppBaseUrlMock = vi.hoisted(() => vi.fn(() => "https://app.test"))
const templateSpy = vi.hoisted(() => vi.fn((props: any) => props))

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
}))

const handlerRegistry = vi.hoisted(() => ({
  handlers: [] as Array<(payload: unknown) => void>,
}))

const onSpy = vi.hoisted(() =>
  vi.fn((_event: string, handler: (payload: unknown) => void) => {
    handlerRegistry.handlers.push(handler)
    return () => {}
  }),
)

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/email/utils", () => ({
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/routes", () => ({
  memberProductPath: (slug: string) => `/member/products/${slug}`,
  productPath: (slug: string) => `/products/${slug}`,
  MEMBER_REWARDS_PATH: "/member/rewards",
}))

vi.mock("@/lib/email/templates/product/productBacklinkVerified", () => ({
  __esModule: true,
  default: templateSpy,
}))

vi.mock("@/lib/server/events", () => ({
  __esModule: true,
  on: onSpy,
}))

import { handleBacklinkVerifiedReward } from "@/lib/server/email/backlinkVerifiedReward"

describe("handleBacklinkVerifiedReward", () => {
  const baseEvent = {
    transactionId: "txn-1",
    userId: "user-1",
    rewardAmount: 100,
    ruleKey: "rewards.backlink.verify",
    ruleName: "Backlink Verified",
    balanceAfter: 200,
    createdAt: new Date("2024-10-19T23:55:00Z"),
    metadata: {
      slug: "wave-tracker",
      backlinkUrl: "https://example.com/shipyard",
      verifiedAt: "2024-10-19T23:45:00.000Z",
    },
    sourceType: "cron",
    sourceId: "backlink-verifier",
    targetType: "product",
    targetId: "prod-1",
    productId: "prod-1",
  }

  beforeEach(() => {
    sendEmailMock.mockReset()
    getAppBaseUrlMock.mockClear()
    templateSpy.mockClear()
    handlerRegistry.handlers.length = 0
    onSpy.mockClear()
    prismaMock.product.findUnique.mockReset()
  })

  it("sends a backlink verification email when reward is awarded", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      name: "Wave Tracker",
      slug: "wave-tracker",
      user: {
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    await handleBacklinkVerifiedReward(baseEvent as any)

    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      select: {
        name: true,
        slug: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.to).toBe("owner@example.com")
    expect(payload.subject).toBe("Wave Tracker backlink verified on Shipyard")

    const element = payload.react
    expect(element.props.ownerName).toBe("Kai Sailor")
    expect(element.props.productName).toBe("Wave Tracker")
    expect(element.props.productUrl).toBe(
      "https://app.test/products/wave-tracker",
    )
    expect(element.props.dashboardUrl).toBe(
      "https://app.test/member/products/wave-tracker",
    )
    expect(element.props.rewardsUrl).toBe("https://app.test/member/rewards")
    expect(element.props.backlinkUrl).toBe(
      "https://example.com/shipyard",
    )
    expect(element.props.verifiedAt).toBeInstanceOf(Date)
  })

  it("does nothing when rule key does not match backlink reward", async () => {
    await handleBacklinkVerifiedReward({
      ...baseEvent,
      ruleKey: "rewards.other",
    } as any)

    expect(prismaMock.product.findUnique).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
