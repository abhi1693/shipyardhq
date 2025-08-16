import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  placeholder,
  commaSeparated,
  formatBoolean,
  formatCurrency,
  formatPercent,
  formatDistanceToNow,
  linkify,
  formatDate,
  slug,
  image,
} from '@/lib/ui/formatters';

describe('formatters (UI)', () => {
  it('placeholder renders a dash', () => {
    render(placeholder() as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('commaSeparated renders list with commas', () => {
    const { container } = render(
      commaSeparated([<span key="1">A</span>, <span key="2">B</span>, <span key="3">C</span>]) as any,
    );
    expect(container.textContent).toContain('A, B, C');
  });
  it('commaSeparated renders placeholder for empty', () => {
    render(commaSeparated([]) as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formatBoolean renders Yes/No badges and placeholder', () => {
    const { rerender } = render(formatBoolean(true) as any);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    rerender(formatBoolean(false) as any);
    expect(screen.getByText('No')).toBeInTheDocument();
    rerender(formatBoolean(undefined) as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formatCurrency renders locale currency and placeholder', () => {
    const { rerender } = render(formatCurrency(12345, 'USD') as any);
    expect(screen.getByText(/\$123\.45/)).toBeInTheDocument();
    rerender(formatCurrency(12345, 'EUR') as any);
    // Rough check for euro formatting
    expect(screen.getByText(/123,45/)).toBeInTheDocument();
    rerender(formatCurrency(undefined as any) as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formatPercent renders value and placeholder', () => {
    const { rerender } = render(formatPercent(12.3456) as any);
    expect(screen.getByText('12.35%')).toBeInTheDocument();
    rerender(formatPercent(null) as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formatDistanceToNow renders distance or placeholder', () => {
    const date = new Date();
    const { rerender } = render(formatDistanceToNow(date) as any);
    expect(screen.getByText(/less than|seconds|minute|hour|day|month|year/)).toBeInTheDocument();
    rerender(formatDistanceToNow(undefined) as any);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('linkify computes external label + subtext', () => {
    render(<>{linkify({ href: 'https://example.com/foo', isExternal: true, subtext: 'sub' })}</> as any);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/foo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText('sub')).toBeInTheDocument();
  });

  
  it('linkify falls back on invalid URL', () => {
    render(<>{linkify({ href: 'nota url', isExternal: true })}</> as any);
    const link = screen.getByRole('link');
    expect(link.textContent).toBe('nota url');
  });
it('formatDate formats a date string', () => {
    render(<>{formatDate('2024-01-01T00:00:00.000Z', 'yyyy')}</> as any);
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('slug and image render', () => {
    render(<>{slug('abc')}</> as any);
    expect(screen.getByText('abc')).toBeInTheDocument();
    render(<>{image('/x.png', 'alt', 1, 1)}</> as any);
    expect(screen.getByAltText('alt')).toBeInTheDocument();
  });
});
