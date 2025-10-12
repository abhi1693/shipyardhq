import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyMock = vi.hoisted(() => vi.fn())
const sendReminderMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    product: {
      findMany: findManyMock,
    },
  },
}))

vi.mock("@/lib/server/email/productBacklinkReminder", () => ({
  sendBacklinkReminderEmail: sendReminderMock,
}))

import prisma from "@/lib/prisma"
import { sendBacklinkReminderEmail } from "@/lib/server/email/productBacklinkReminder"
import { runBacklinkReminder } from "@/lib/server/rewards/backlinkReminder"

const mockedFindMany = vi.mocked(prisma.product.findMany)
const mockedSendReminder = vi.mocked(sendBacklinkReminderEmail)

describe("runBacklinkReminder", () => {
  beforeEach(() => {
    findManyMock.mockReset()
    sendReminderMock.mockReset()
  })

  it("sends reminders for eligible products", async () => {
    mockedFindMany.mockResolvedValueOnce([
      {
        id: "prod-1",
        name: "Wave Tracker",
        slug: "wave-tracker",
        user: {
          email: "owner@example.com",
          firstName: "Kai",
          lastName: "Sailor",
        },
      },
    ])

    mockedSendReminder.mockResolvedValueOnce(undefined)

    const summary = await runBacklinkReminder(new Date("2025-02-01T00:00:00Z"))

    expect(mockedSendReminder).toHaveBeenCalledWith({
      ownerEmail: "owner@example.com",
      ownerFirstName: "Kai",
      ownerLastName: "Sailor",
      productName: "Wave Tracker",
      productSlug: "wave-tracker",
    })

    expect(summary).toEqual({
      candidates: 1,
      emailed: 1,
      skippedNoEmail: 0,
      failures: [],
    })
  })

  it("skips products without an owner email", async () => {
    mockedFindMany.mockResolvedValueOnce([
      {
        id: "prod-2",
        name: "Echo Map",
        slug: "echo-map",
        user: {
          email: "",
          firstName: "Lena",
          lastName: "Chart",
        },
      },
    ])

    const summary = await runBacklinkReminder()

    expect(mockedSendReminder).not.toHaveBeenCalled()
    expect(summary).toEqual({
      candidates: 1,
      emailed: 0,
      skippedNoEmail: 1,
      failures: [],
    })
  })

  it("records failures when email sending throws", async () => {
    mockedFindMany.mockResolvedValueOnce([
      {
        id: "prod-3",
        name: "Signal Compass",
        slug: "signal-compass",
        user: {
          email: "owner@example.com",
          firstName: "Riley",
          lastName: "North",
        },
      },
    ])

    mockedSendReminder.mockRejectedValueOnce(new Error("Email service down"))

    const summary = await runBacklinkReminder()

    expect(summary).toEqual({
      candidates: 1,
      emailed: 0,
      skippedNoEmail: 0,
      failures: [{ productId: "prod-3", reason: "Email service down" }],
    })
  })
})
