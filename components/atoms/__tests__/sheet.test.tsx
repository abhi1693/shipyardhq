import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/atoms/sheet';

describe('Sheet atoms', () => {
  it('renders overlay, content and header when open', () => {
    render(
      <Sheet open>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    // Overlay and content rendered via portal
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });
});

