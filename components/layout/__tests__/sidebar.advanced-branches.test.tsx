import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// Force desktop by default; we will override for mobile case per-test
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

// Mock tooltip primitives to render content immediately for test visibility
vi.mock("@/components/atoms/tooltip", () => ({
  __esModule: true,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { SidebarProvider, Sidebar, SidebarMenuButton } from "@/components/atoms/sidebar";

describe("Sidebar advanced branches", () => {
  it("renders collapsible=none branch", () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none">Content</Sidebar>
      </SidebarProvider>
    );
    expect(container.querySelector('[data-slot="sidebar"]')).toBeTruthy();
    expect(screen.getByText(/Content/)).toBeInTheDocument();
  });

  it("renders SidebarMenuButton with tooltip as string and object", () => {
    const { rerender } = render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenuButton tooltip="Tip">Btn</SidebarMenuButton>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("Tip")).toBeInTheDocument();

    rerender(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenuButton tooltip={{ children: "ObjTip", side: "right" }}>Btn</SidebarMenuButton>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText("ObjTip")).toBeInTheDocument();
  });
});

describe("Sidebar mobile branch", () => {
  it("renders mobile Sheet variant without crashing", async () => {
    // Ensure fresh module instance with mobile + sheet mocks
    await vi.resetModules();
    vi.doMock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
    vi.doMock("@/components/atoms/tooltip", () => ({
      __esModule: true,
      TooltipProvider: ({ children }: any) => <>{children}</>,
      Tooltip: ({ children }: any) => <div>{children}</div>,
      TooltipTrigger: ({ children }: any) => <div>{children}</div>,
      TooltipContent: ({ children }: any) => <div>{children}</div>,
    }));
    vi.doMock("@/components/atoms/sheet", () => ({
      __esModule: true,
      Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
      SheetContent: ({ children }: any) => <div>{children}</div>,
      SheetHeader: ({ children }: any) => <div>{children}</div>,
      SheetTitle: ({ children }: any) => <div>{children}</div>,
      SheetDescription: ({ children }: any) => <div>{children}</div>,
    }));
    const M = await import("@/components/atoms/sidebar");
    const { container } = render(
      <M.SidebarProvider>
        <M.Sidebar>MobileContent</M.Sidebar>
      </M.SidebarProvider>
    );
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
    expect(container.textContent).toContain("MobileContent");
  });
});
