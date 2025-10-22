import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const authMock = vi.hoisted(() => vi.fn())
const getClerkUserByIdCachedMock = vi.hoisted(() => vi.fn())
const cookiesMock = vi.hoisted(() => vi.fn())
const cookieSetMock = vi.hoisted(() => vi.fn())
const prismaUserUpdateManyMock = vi.hoisted(() => vi.fn())
const subscribeMock = vi.hoisted(() => vi.fn())
const unsubscribeMock = vi.hoisted(() => vi.fn())
const getActiveUserMock = vi.hoisted(() => vi.fn())
const syncUserFromClerkMock = vi.hoisted(() => vi.fn())
const sendEmailMock = vi.hoisted(() => vi.fn())
const invalidateActiveUserCacheMock = vi.hoisted(() => vi.fn())
const revalidateUserMock = vi.hoisted(() => vi.fn())

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}))

vi.mock("@/lib/server/clerkUsers", () => ({
  getClerkUserByIdCached: getClerkUserByIdCachedMock,
}))

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      updateMany: prismaUserUpdateManyMock,
    },
  },
}))

vi.mock("@/actions/public/newsletter/actions", () => ({
  subscribeToNewsletterAction: subscribeMock,
  unsubscribeFromNewsletterAction: unsubscribeMock,
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: getActiveUserMock,
  INACTIVE_ACCOUNT_MESSAGE: "inactive",
  invalidateActiveUserCache: invalidateActiveUserCacheMock,
}))

vi.mock("@/actions/member/users/actions", () => ({
  syncUserFromClerk: syncUserFromClerkMock,
}))

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateUser: revalidateUserMock,
}))

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

import { completeOnboarding } from "@/actions/member/onboarding/actions"

describe("completeOnboarding", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const cookieStoreMock = { set: cookieSetMock }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.shipyard.test"

    authMock.mockResolvedValue({ userId: "user_123" })
    getClerkUserByIdCachedMock.mockResolvedValue({ id: "user_123" })

    cookiesMock.mockResolvedValue(cookieStoreMock)
    cookieSetMock.mockReset()

    prismaUserUpdateManyMock.mockReset()
    prismaUserUpdateManyMock.mockResolvedValue({ count: 1 })
    subscribeMock.mockResolvedValue({ success: true })
    unsubscribeMock.mockResolvedValue({ success: true })
    getActiveUserMock.mockResolvedValue({
      id: "local_1",
      email: "crew@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "member",
      status: "active",
    })
    syncUserFromClerkMock.mockResolvedValue(undefined)
    sendEmailMock.mockResolvedValue({})
    invalidateActiveUserCacheMock.mockClear()
    invalidateActiveUserCacheMock.mockResolvedValue(undefined)
    revalidateUserMock.mockReset()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    vi.clearAllMocks()
  })

  it("sends a builder welcome email with leaderboard guidance", async () => {
    const formData = new FormData()
    formData.append("roleIntent", "launch-product")
    formData.append("heardFrom", "twitter")
    formData.append("newsletterOptIn", "true")

    const result = await completeOnboarding(formData)

    expect(result).toEqual({ success: true })
    expect(prismaUserUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "local_1", onboardedAt: null },
      data: {
        heardFrom: "twitter",
        onboardedAt: expect.any(Date),
        roleIntent: "launch-product",
      },
    })

    expect(subscribeMock).toHaveBeenCalledWith("crew@example.com")
    expect(unsubscribeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const emailArgs = sendEmailMock.mock.calls[0][0]
    expect(emailArgs).toMatchObject({
      to: "crew@example.com",
      subject: "Welcome aboard ShipYardHQ",
    })
    expect(emailArgs.text).toContain("Scoring guide")
    expect(emailArgs.text).toContain("/leaderboard")
    expect(emailArgs.text).toContain("/member/feedback")
    expect(emailArgs.text).toContain("/rewards")
    expect(emailArgs.text).toContain("Shipyard Rewards powers placements")
    expect(emailArgs.text).toContain("Fleet Pulse tracks live balances")
    expect(invalidateActiveUserCacheMock).toHaveBeenCalledWith("user_123")
    expect(revalidateUserMock).toHaveBeenCalledWith("local_1")
  })

  it("sends an explorer welcome email without builder extras", async () => {
    const formData = new FormData()
    formData.append("roleIntent", "explore")
    formData.append("heardFrom", "google")
    formData.append("newsletterOptIn", "false")

    const result = await completeOnboarding(formData)

    expect(result).toEqual({ success: true })
    expect(unsubscribeMock).toHaveBeenCalledWith("crew@example.com")
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const emailArgs = sendEmailMock.mock.calls[0][0]
    expect(emailArgs.text).not.toContain("Scoring guide")
    expect(emailArgs.text).toContain("/member/feedback")
    expect(emailArgs.text).toContain("/rewards")
    expect(emailArgs.text).toContain("Shipyard Rewards powers placements")
    expect(emailArgs.text).toContain("Fleet Pulse tracks live balances")
    expect(invalidateActiveUserCacheMock).toHaveBeenCalledWith("user_123")
    expect(revalidateUserMock).toHaveBeenCalledWith("local_1")
  })

  it("subscribes users by default when the opt-in flag is omitted", async () => {
    subscribeMock.mockClear()
    unsubscribeMock.mockClear()

    const formData = new FormData()
    formData.append("roleIntent", "explore")
    formData.append("heardFrom", "google")

    const result = await completeOnboarding(formData)

    expect(result).toEqual({ success: true })
    expect(subscribeMock).toHaveBeenCalledWith("crew@example.com")
    expect(unsubscribeMock).not.toHaveBeenCalled()
    expect(invalidateActiveUserCacheMock).toHaveBeenCalledWith("user_123")
    expect(revalidateUserMock).toHaveBeenCalledWith("local_1")
  })

  it("skips the welcome email when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    sendEmailMock.mockClear()

    const formData = new FormData()
    formData.append("roleIntent", "explore")
    formData.append("heardFrom", "google")

    const result = await completeOnboarding(formData)

    expect(result).toEqual({ success: true })
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(invalidateActiveUserCacheMock).toHaveBeenCalledWith("user_123")
    expect(revalidateUserMock).toHaveBeenCalledWith("local_1")
  })

  it("skips side effects when onboarding already completed", async () => {
    prismaUserUpdateManyMock.mockResolvedValue({ count: 0 })

    const formData = new FormData()
    formData.append("roleIntent", "explore")
    formData.append("heardFrom", "google")

    const result = await completeOnboarding(formData)

    expect(result).toEqual({ success: true })
    expect(subscribeMock).not.toHaveBeenCalled()
    expect(unsubscribeMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(invalidateActiveUserCacheMock).not.toHaveBeenCalled()
    expect(revalidateUserMock).not.toHaveBeenCalled()
  })
})
