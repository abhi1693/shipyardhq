import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  SidebarProvider,
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/atoms/sidebar';

// Desktop by default
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('Sidebar menu elements', () => {
  it('SidebarMenuButton applies variant/size and active attributes', () => {
    render(
      <SidebarProvider open={false}>
        <Sidebar collapsible="icon">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton variant="outline" size="lg" isActive data-testid="btn" />
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );
    const btn = document.querySelector('[data-testid="btn"]') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('data-size')).toBe('lg');
    expect(btn.getAttribute('data-active')).toBe('true');
  });

  it('SidebarMenuAction showOnHover class and badge render', () => {
    render(
      <SidebarProvider open={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuAction showOnHover data-testid="action" />
              <SidebarMenuBadge data-testid="badge">3</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );
    const action = document.querySelector('[data-testid="action"]') as HTMLElement;
    expect(action.className).toContain('md:opacity-0');
    expect(document.querySelector('[data-testid="badge"]')).toBeTruthy();
  });

  it('SidebarMenuButton renders tooltip when provided as string', () => {
    render(
      <SidebarProvider open={false}>
        <Sidebar collapsible="icon">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Help" />
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );
    // Button still renders when tooltip prop is provided
    const btn = document.querySelector('[data-sidebar="menu-button"]') as HTMLElement;
    expect(btn).toBeTruthy();
  });

  it('SidebarMenuSkeleton renders and sub button size/active attributes', () => {
    render(
      <SidebarProvider open={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton size="sm" isActive data-testid="subbtn">Item</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    );
    const skelText = document.querySelector('[data-sidebar="menu-skeleton-text"]') as HTMLElement;
    expect(skelText.getAttribute('style') || '').toContain('--skeleton-width');
    const subbtn = document.querySelector('[data-testid="subbtn"]') as HTMLElement;
    expect(subbtn.getAttribute('data-size')).toBe('sm');
    expect(subbtn.getAttribute('data-active')).toBe('true');
  });
});
