import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarRail,
} from "@/components/atoms/sidebar"

beforeEach(() => {
  // reset cookie before each test
  document.cookie = ""
})

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))

describe("Sidebar variants and interactions", () => {
  it('supports collapsible="none" variant and sets cookie on toggle', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>,
    )
    const fixed = document.querySelector('[data-slot="sidebar"]') as HTMLElement
    expect(fixed).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }))
    // Cookie is written on toggle
    expect(document.cookie).toContain("sidebar_state=")
  })

  it("toggles via rail click and keyboard shortcut", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Desktop</SidebarContent>
        </Sidebar>
        <SidebarRail />
      </SidebarProvider>,
    )
    const wrapper = document.querySelector(
      '[data-slot="sidebar"][data-state]',
    ) as HTMLElement
    const initial = wrapper.getAttribute("data-state")
    const rail = document.querySelector(
      '[data-slot="sidebar-rail"]',
    ) as HTMLElement
    expect(rail).toBeTruthy()
    // Click rail toggles
    fireEvent.click(rail)
    const afterRail = wrapper.getAttribute("data-state")
    expect(afterRail).not.toBe(initial)
    // Keyboard shortcut toggles again (Cmd/Ctrl + b)
    fireEvent.keyDown(window, { key: "b", metaKey: true })
    const afterKey = wrapper.getAttribute("data-state")
    expect(afterKey).not.toBe(afterRail)
  })
})
