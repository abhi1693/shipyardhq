import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const authMock = vi.hoisted(() => vi.fn())
const clerkClientMock = vi.hoisted(() => vi.fn())
const getUserMock = vi.hoisted(() => vi.fn())
const updateUserMock = vi.hoisted(() => vi.fn())
const cookiesMock = vi.hoisted(() => vi.fn())
const cookieSetMock = vi.hoisted(() => vi.fn())
const prismaUserUpdateMock = vi.hoisted(() => vi.fn())
const subscribeMock = vi.hoisted(() => vi.fn())
const unsubscribeMock = vi.hoisted(() => vi.fn())
const getActiveUserMock = vi.hoisted(() => vi.fn())
const syncUserFromClerkMock = vi.hoisted(() => vi.fn())
const sendEmailMock = vi.hoisted(() => vi.fn())

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  clerkClient: clerkClientMock,
}))

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      update: prismaUserUpdateMock,
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
}))

vi.mock("@/actions/member/users/actions", () => ({
  syncUserFromClerk: syncUserFromClerkMock,
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
    getUserMock.mockResolvedValue({ id: "user_123" })
    updateUserMock.mockResolvedValue({})
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: getUserMock,
        updateUser: updateUserMock,
      },
    })

    cookiesMock.mockResolvedValue(cookieStoreMock)
    cookieSetMock.mockReset()

    prismaUserUpdateMock.mockResolvedValue({})
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
  })
})
