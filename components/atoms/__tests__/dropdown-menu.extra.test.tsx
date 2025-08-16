import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/atoms/dropdown-menu"

describe("DropdownMenu extra", () => {
  it("renders checkbox, radio, group, sub, and shortcut", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Label</DropdownMenuLabel>
            <DropdownMenuItem variant="destructive">
              Delete<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>Check</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="r1">
              <DropdownMenuRadioItem value="r1">One</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="r2">Two</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>SubItem</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    expect(screen.getByText("Open")).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="dropdown-menu-checkbox-item"]'),
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="dropdown-menu-radio-item"]'),
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="dropdown-menu-group"]'),
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="dropdown-menu-sub-trigger"]'),
    ).toBeTruthy()
    const destructive = document.querySelector(
      '[data-slot="dropdown-menu-item"]',
    ) as HTMLElement
    expect(destructive.getAttribute("data-variant")).toBe("destructive")
    expect(
      document.querySelector('[data-slot="dropdown-menu-shortcut"]')
        ?.textContent,
    ).toContain("⌘")
  })
})
