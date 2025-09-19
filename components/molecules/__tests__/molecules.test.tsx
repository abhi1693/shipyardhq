import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import CopyButton from "@/components/molecules/CopyButton"
import SignInCtaButton from "@/components/molecules/SignInCtaButton"
import ExternalBadgeLink from "@/components/molecules/ExternalBadgeLink"
import MemberAreaButton from "@/components/molecules/MemberAreaButton"
import ShareOnXButton from "@/components/molecules/ShareOnXButton"

describe("molecules", () => {
  const OLD_CLIP = (global as any).navigator?.clipboard
  const OLD_LOC = (global as any).window?.location

  beforeEach(() => {
    ;(global as any).navigator = {
      ...((global as any).navigator || {}),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    } as any
    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      writable: true,
    })
  })

  afterEach(() => {
    if (OLD_CLIP) (global as any).navigator.clipboard = OLD_CLIP
    if (OLD_LOC) (window as any).location = OLD_LOC
  })

  it("CopyButton copies and shows Copied", async () => {
    render(<CopyButton text="/p/abc" resolveAbsolute label="Copy" />)
    await screen.getByRole("button", { name: "Copy" }).click()
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })

  it("SignInCtaButton renders label", () => {
    render(<SignInCtaButton />)
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("ExternalBadgeLink renders link and badge", () => {
    render(<ExternalBadgeLink href="/x">Go</ExternalBadgeLink>)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/x")
    expect(screen.getByText("Go")).toBeInTheDocument()
  })

  it("MemberAreaButton renders default label", () => {
    render(<MemberAreaButton />)
    expect(
      screen.getByRole("button", { name: /member area/i }),
    ).toBeInTheDocument()
  })

  it("ShareOnXButton opens intent with tagline", async () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as any)
    render(
      <ShareOnXButton path="/p/abc" productName="Cool" tagline="Do more with less" />,
    )
    await screen.getByRole("button", { name: /share on x/i }).click()
    expect(openSpy).toHaveBeenCalled()
    const url = (openSpy as any).mock.calls[0][0] as string
    expect(url).toContain("https://x.com/intent/tweet")
    const intent = new URL(url)
    expect(intent.searchParams.get("text")).toContain(
      "Cool — Do more with less",
    )
    openSpy.mockRestore()
  })
})
