import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, beforeEach, it, expect, vi } from "vitest"

import { OnboardingForm } from "../form"
import { MEMBER_OVERVIEW_PATH } from "@/lib/routes"

const {
  replaceMock,
  refreshMock,
  completeOnboardingMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  completeOnboardingMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock("@/actions/member/onboarding/actions", () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboardingMock(...args),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

const selectRoleIntent = (labelMatcher: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: labelMatcher }))
}

const selectHeardFrom = (labelMatcher: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: labelMatcher }))
}

const submitForm = () => {
  fireEvent.click(screen.getByRole("button", { name: /Complete Onboarding/i }))
}

describe("OnboardingForm redirect intent handling", () => {
  beforeEach(() => {
    replaceMock.mockClear()
    refreshMock.mockClear()
    completeOnboardingMock.mockReset()
    toastSuccessMock.mockClear()
    toastErrorMock.mockClear()
    completeOnboardingMock.mockResolvedValue({ success: true })
  })

  it("returns exploring users from navbar sign-in back to the originating page", async () => {
    render(
      <OnboardingForm
        redirectTo="/browse?category=design"
        redirectSource="navbar"
      />,
    )

    selectRoleIntent(/Just exploring/i)
    selectHeardFrom(/Twitter\/X/i)
    submitForm()

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/browse?category=design"),
    )
  })

  it("keeps builder intents within the member hub even when triggered from the navbar", async () => {
    render(
      <OnboardingForm
        redirectTo="/browse?category=design"
        redirectSource="navbar"
      />,
    )

    selectRoleIntent(/Launch a product/i)
    selectHeardFrom(/Twitter\/X/i)
    submitForm()

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(MEMBER_OVERVIEW_PATH),
    )
  })

  it("always honors member area redirects regardless of intent or source", async () => {
    render(
      <OnboardingForm
        redirectTo="/member/products/add?status=draft"
        redirectSource="navbar"
      />,
    )

    selectRoleIntent(/Just exploring/i)
    selectHeardFrom(/Twitter\/X/i)
    submitForm()

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/member/products/add?status=draft",
      ),
    )
  })
})
