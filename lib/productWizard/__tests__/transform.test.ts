import { describe, it, expect } from 'vitest';
import {
  parseKeywords,
  uppercaseCurrency,
  sanitizeTextFields,
  normalizeUrl,
  coercePricing,
} from '@/lib/productWizard/transform';

describe('productWizard transform', () => {
  it('parseKeywords splits, trims, lowercases, and dedupes', () => {
    expect(parseKeywords('AI, productivity, ai , Tools, ')).toEqual([
      'ai',
      'productivity',
      'tools',
    ]);
    expect(parseKeywords('')).toEqual([]);
    expect(parseKeywords(undefined)).toEqual([]);
  });

  it('uppercaseCurrency uppercases or returns undefined', () => {
    expect(uppercaseCurrency('usd')).toBe('USD');
    expect(uppercaseCurrency(undefined)).toBeUndefined();
    expect(uppercaseCurrency(null as any)).toBeUndefined();
  });

  it('sanitizeTextFields trims selected string fields only', () => {
    const input = {
      name: '  Name  ',
      tagline: '  Tag ',
      websiteUrl: ' example.com ',
      logo: ' /img.png ',
      ctaLabel: ' Go ',
      ctaUrl: ' /go ',
      untouched: ' no-trim ',
      num: 1,
    };
    const out = sanitizeTextFields(input);
    expect(out).toMatchObject({
      name: 'Name',
      tagline: 'Tag',
      websiteUrl: 'example.com',
      logo: '/img.png',
      ctaLabel: 'Go',
      ctaUrl: '/go',
      untouched: ' no-trim ',
      num: 1,
    });
  });

  it('normalizeUrl adds https if missing and trims', () => {
    expect(normalizeUrl(' example.com ')).toBe('https://example.com');
    expect(normalizeUrl('http://x.com')).toBe('http://x.com');
    expect(normalizeUrl('')).toBeUndefined();
    expect(normalizeUrl(undefined)).toBeUndefined();
  });

  it('coercePricing clears price fields for free/custom', () => {
    const free = coercePricing({ pricingModel: 'free', startingPriceCents: 500, currencyCode: 'usd' });
    expect(free.startingPriceCents).toBeUndefined();
    expect(free.currencyCode).toBeUndefined();

    const custom = coercePricing({ pricingModel: 'custom', startingPriceCents: 500, currencyCode: 'usd' });
    expect(custom.startingPriceCents).toBeUndefined();
    expect(custom.currencyCode).toBeUndefined();

    const paid = coercePricing({ pricingModel: 'subscription', startingPriceCents: 500, currencyCode: 'usd' });
    expect(paid.startingPriceCents).toBe(500);
    expect(paid.currencyCode).toBe('usd');
  });
});

