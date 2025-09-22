import { render, screen } from "@testing-library/react"
import AdminAccountProfile from "@/components/pages/AdminAccountProfile"
import MemberAccountProfile from "@/components/pages/MemberAccountProfile"
import { vi } from "vitest"
import {
  ADMIN_ACCOUNT_PROFILE_PATH,
  MEMBER_ACCOUNT_PROFILE_PATH,
} from "@/lib/routes"

vi.mock("@clerk/nextjs", () => ({
  UserProfile: (props: any) => <div>ProfilePath:{props.path}</div>,
}))

describe("Account Profile pages", () => {
  it("renders admin profile", () => {
    render(<AdminAccountProfile />)
    expect(
      screen.getByText(
        new RegExp(
          `ProfilePath:${ADMIN_ACCOUNT_PROFILE_PATH.replace(/\//g, "\\/")}`,
        ),
      ),
    ).toBeInTheDocument()
  })

  it("renders member profile", () => {
    render(<MemberAccountProfile />)
    expect(
      screen.getByText(
        new RegExp(`ProfilePath:${MEMBER_ACCOUNT_PROFILE_PATH.replace(/\//g, "\\/")}`),
      ),
    ).toBeInTheDocument()
  })
})
