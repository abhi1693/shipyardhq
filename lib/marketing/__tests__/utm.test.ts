import { describe, it, expect } from 'vitest';
import { addUtmParams } from '@/lib/marketing/utm';

describe('marketing utm', () => {
  it('adds params to absolute URL and preserves existing ones', () => {
    const url = 'https://example.com/page?utm_source=keep&x=1';
    const out = addUtmParams(url, {
      source: 'new',
      medium: 'email',
      campaign: 'spring',
      content: 'cta',
      term: 'keyword',
    });
    const u = new URL(out);
    // existing utm_source should remain "keep"
    expect(u.searchParams.get('utm_source')).toBe('keep');
    expect(u.searchParams.get('utm_medium')).toBe('email');
    expect(u.searchParams.get('utm_campaign')).toBe('spring');
    expect(u.searchParams.get('utm_content')).toBe('cta');
    expect(u.searchParams.get('utm_term')).toBe('keyword');
    expect(u.searchParams.get('x')).toBe('1');
  });

  it('returns original string when URL is invalid', () => {
    expect(addUtmParams('/relative', { source: 'x' })).toBe('/relative');
  });
});

