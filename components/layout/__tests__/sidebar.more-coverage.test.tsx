import React from "react";
import { render, screen } from "@testing-library/react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarFooter,
  SidebarInput,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/atoms/sidebar";
import { vi } from "vitest";

// Force desktop path (isMobile=false)
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

describe("Sidebar suite coverage", () => {
  it("renders desktop sidebar and toggles via trigger and rail", () => {
    const { container } = render(
      <SidebarProvider>
        <div>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <SidebarHeader>Header</SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Lbl</SidebarGroupLabel>
                <SidebarGroupAction aria-label="group-action" />
                <SidebarGroupContent>Group content</SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>Item</SidebarMenuButton>
                    <SidebarMenuAction aria-label="menu-action" />
                    <SidebarMenuBadge>1</SidebarMenuBadge>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton>Sub</SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>Footer</SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <SidebarInput aria-label="search" />
          </SidebarInset>
          <SidebarSeparator />
          <SidebarTrigger aria-label="Toggle Sidebar" />
          <SidebarRail />
        </div>
      </SidebarProvider>
    );

    // Trigger and rail exist
    expect(screen.getAllByLabelText(/Toggle Sidebar/i).length).toBeGreaterThan(0);
    expect(container.querySelector('[data-slot="sidebar-rail"]')).toBeTruthy();
    // Cookie write occurs on initial render when toggled later; we just simulate clicks
    screen.getAllByLabelText(/Toggle Sidebar/i)[0].click();
    (container.querySelector('[data-slot="sidebar-rail"]') as HTMLElement).click();
    // Basic content visible
    expect(screen.getByText(/Header/)).toBeInTheDocument();
    expect(screen.getByText(/Group content/)).toBeInTheDocument();
    expect(screen.getByText(/Footer/)).toBeInTheDocument();
  });
});
