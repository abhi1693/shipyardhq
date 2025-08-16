import { describe, it, expect } from 'vitest';
import { toCreateFormData, toUpdatePayload, getInitialValuesFromProduct } from '@/lib/productWizard/mappers';

describe('productWizard mappers (branch coverage)', () => {
  it('toCreateFormData omits optional fields when absent and falls back on empty strings', () => {
    const values: any = {
      name: '',
      tagline: '',
      description: '',
      websiteUrl: '', // normalizeUrl returns undefined -> falls back to ''
      logo: '', // same as above
      categoryId: 'cat',
      type: 'saas',
      pricingModel: 'free', // coerces price fields to undefined
      platforms: [], // no append for platforms
      keywordsText: '', // no keywords appended
      startingPriceCents: undefined,
      currencyCode: undefined,
      organizationId: '',
      ctaLabel: '',
      ctaUrl: '',
      bannerImage: '',
      githubUrl: '',
      twitterUrl: '',
      demoUrl: '',
      contactEmail: '',
      utmCampaign: '',
      status: undefined,
    };

    const fd = toCreateFormData(values, 'user-xyz');
    const entries = Object.fromEntries(fd as any);

    // Basic fields exist
    expect(entries).toMatchObject({
      name: '', tagline: '', description: '', categoryId: 'cat', type: 'saas', pricingModel: 'free', userId: 'user-xyz',
    });
    // Fallback keeps empty strings for url fields
    expect(entries.websiteUrl).toBe('');
    expect(entries.logo).toBe('');
    // Omitted optional fields should be undefined
    expect(entries.platforms).toBeUndefined();
    expect(entries.keywords).toBeUndefined();
    expect(entries.startingPriceCents).toBeUndefined();
    expect(entries.currencyCode).toBeUndefined();
    expect(entries.organizationId).toBeUndefined();
    expect(entries.ctaLabel).toBeUndefined();
    expect(entries.ctaUrl).toBeUndefined();
    expect(entries.bannerImage).toBeUndefined();
    expect(entries.githubUrl).toBeUndefined();
    expect(entries.twitterUrl).toBeUndefined();
    expect(entries.demoUrl).toBeUndefined();
    expect(entries.contactEmail).toBeUndefined();
    expect(entries.utmCampaign).toBeUndefined();
    expect(entries.status).toBeUndefined();
  });

  it('toCreateFormData appends all optional fields when present', () => {
    const values: any = {
      name: 'n', tagline: 't', description: 'd', websiteUrl: 'http://e.com', logo: 'http://l',
      categoryId: 'cat', type: 'saas', pricingModel: 'subscription',
      platforms: ['web', 'ios'], keywordsText: 'a, b', startingPriceCents: 5000, currencyCode: 'eur',
      organizationId: 'org1', ctaLabel: 'Go', ctaUrl: 'go', bannerImage: 'b',
      githubUrl: 'gh', twitterUrl: 'tw', demoUrl: 'demo', contactEmail: 'x@y', utmCampaign: 'u', status: 'draft',
    };
    const fd = toCreateFormData(values, 'u1', 'p1');
    const e = Object.fromEntries(fd as any);
    expect(e).toMatchObject({
      id: 'p1', name: 'n', tagline: 't', description: 'd', categoryId: 'cat', type: 'saas', pricingModel: 'subscription', userId: 'u1', status: 'draft',
      platforms: JSON.stringify(['web','ios']), keywords: JSON.stringify(['a','b']), startingPriceCents: '5000', currencyCode: 'EUR',
      ctaLabel: 'Go', contactEmail: 'x@y', utmCampaign: 'u'
    });
    // normalized optional urls
    expect(e.websiteUrl).toBe('http://e.com');
    expect(e.logo).toBe('http://l');
    expect(e.ctaUrl).toMatch(/^https:\/\//);
    expect(e.bannerImage).toMatch(/^https:\/\//);
    expect(e.githubUrl).toMatch(/^https:\/\//);
    expect(e.twitterUrl).toMatch(/^https:\/\//);
    expect(e.demoUrl).toMatch(/^https:\/\//);
  });

  it('toUpdatePayload toggles optional fields and numeric coercion', () => {
    const values: any = {
      name: 'n', tagline: 't', description: 'd', websiteUrl: '', logo: '',
      categoryId: 'cat', type: 'saas', pricingModel: 'custom', startingPriceCents: null, currencyCode: undefined,
      platforms: [], keywordsText: '', organizationId: '', ctaLabel: '', ctaUrl: '', bannerImage: '',
      githubUrl: '', twitterUrl: '', demoUrl: '', contactEmail: '', utmCampaign: ''
    };
    const out = toUpdatePayload(values, { userId: 'u' });
    // startingPriceCents undefined when null, currency undefined when missing
    expect(out.startingPriceCents).toBeUndefined();
    expect(out.currencyCode).toBeUndefined();
    // optional nulls when empty
    expect(out.organizationId).toBeNull();
    expect(out.ctaLabel).toBeNull();
    expect(out.ctaUrl).toBeNull();
    expect(out.bannerImage).toBeNull();
    expect(out.githubUrl).toBeNull();
    expect(out.twitterUrl).toBeNull();
    expect(out.demoUrl).toBeNull();
    expect(out.contactEmail).toBeNull();
    expect(out.utmCampaign).toBeNull();
  });

  it('toUpdatePayload sets optional URL fields when present', () => {
    const values: any = {
      name: 'n', tagline: 't', description: 'd', websiteUrl: 'e.com', logo: '/l',
      categoryId: 'cat', type: 'saas', pricingModel: 'subscription', startingPriceCents: 1500, currencyCode: 'usd',
      platforms: ['web'], keywordsText: 'a', organizationId: 'org', ctaLabel: 'Go', ctaUrl: 'go', bannerImage: 'b',
      githubUrl: 'gh', twitterUrl: 'tw', demoUrl: 'demo', contactEmail: 'x@y', utmCampaign: 'u', status: 'draft'
    };
    const out = toUpdatePayload(values, { userId: 'u' });
    expect(out).toMatchObject({
      websiteUrl: 'https://e.com', logo: 'https:///l',
      ctaUrl: 'https://go', bannerImage: 'https://b',
      githubUrl: 'https://gh', twitterUrl: 'https://tw', demoUrl: 'https://demo',
    });
  });

  it('getInitialValuesFromProduct handles missing metadata fields', () => {
    const product: any = {
      name: 'P', categoryId: 'cat', type: 'saas', pricingModel: 'free', status: 'draft',
      metadata: null,
    };
    const v = getInitialValuesFromProduct(product);
    expect(v).toMatchObject({ githubUrl: '', twitterUrl: '', demoUrl: '', contactEmail: '', utmCampaign: '' });
  });
});
