import { describe, it, expect, vi, beforeEach } from "vitest"

const { authMock, getActiveUserByClerkIdMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getActiveUserByClerkIdMock: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}))

vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: getActiveUserByClerkIdMock,
}))

import { checkRole } from "@/lib/roles"

describe("roles.checkRole", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ userId: "user_1" })
    getActiveUserByClerkIdMock.mockResolvedValue({
      id: "user_1",
      email: "captain@shipyard.test",
      role: "admin",
      status: "active",
      firstName: "Captain",
      lastName: "Shipyard",
      onboardedAt: null,
    })
  })

  it("returns true when the database role matches", async () => {
    await expect(checkRole("admin" as any)).resolves.toBe(true)
  })

  it("returns false when the database role differs", async () => {
    getActiveUserByClerkIdMock.mockResolvedValue({
      id: "user_1",
      email: "crew@shipyard.test",
      role: "member",
      status: "active",
      firstName: "Crew",
      lastName: "Mate",
      onboardedAt: null,
    })

    await expect(checkRole("admin" as any)).resolves.toBe(false)
  })

  it("returns false when the user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null })

    await expect(checkRole("admin" as any)).resolves.toBe(false)
  })
})
