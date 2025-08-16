import { describe, it, expect } from 'vitest';
import {
  getInitialValuesForAdd,
  getInitialValuesFromProduct,
  toCreateFormData,
  toUpdatePayload,
} from '@/lib/productWizard/mappers';

describe('productWizard mappers', () => {
  it('getInitialValuesForAdd returns defaults', () => {
    const v = getInitialValuesForAdd();
    expect(v.name).toBe('');
    expect(v.type).toBe('saas');
    expect(v.pricingModel).toBe('free');
    expect(v.platforms).toEqual([]);
  });

  it('getInitialValuesFromProduct maps product fields', () => {
    const product = {
      name: 'Prod',
      tagline: null,
      description: undefined,
      websiteUrl: 'http://e.com',
      logo: 'l',
      categoryId: 'cat',
      type: 'saas',
      pricingModel: 'subscription',
      startingPriceCents: 1234,
      currencyCode: 'USD',
      platforms: ['web'],
      keywords: ['a', 'b'],
      organizationId: 'org',
      ctaLabel: 'Go',
      ctaUrl: 'http://go',
      bannerImage: 'http://b',
      metadata: { githubUrl: 'http://gh', twitterUrl: '', demoUrl: '', contactEmail: 'x@y', utmCampaign: 'c' },
      status: 'draft',
    };
    const v = getInitialValuesFromProduct(product);
    expect(v).toMatchObject({
      name: 'Prod',
      tagline: '',
      description: '',
      websiteUrl: 'http://e.com',
      logo: 'l',
      categoryId: 'cat',
      pricingModel: 'subscription',
      startingPriceCents: 1234,
      currencyCode: 'USD',
      platforms: ['web'],
      keywordsText: 'a, b',
      organizationId: 'org',
      ctaLabel: 'Go',
      ctaUrl: 'http://go',
      bannerImage: 'http://b',
      githubUrl: 'http://gh',
      contactEmail: 'x@y',
      utmCampaign: 'c',
      status: 'draft',
    });
  });

  it('toCreateFormData builds expected entries', () => {
    const values: any = {
      name: ' Name ',
      tagline: ' Tag ',
      description: ' Desc ',
      websiteUrl: 'example.com',
      logo: '/img',
      categoryId: 'cat',
      type: 'saas',
      pricingModel: 'subscription',
      platforms: ['web'],
      keywordsText: 'a, b, a',
      startingPriceCents: 1234,
      currencyCode: 'usd',
      ctaUrl: 'go',
    };
    const fd = toCreateFormData(values, 'user-1', 'prod-1');
    const entries = Object.fromEntries(fd as any);
    expect(entries).toMatchObject({
      id: 'prod-1',
      name: 'Name',
      tagline: 'Tag',
      description: ' Desc ',
      websiteUrl: 'https://example.com',
      logo: 'https:///img',
      categoryId: 'cat',
      type: 'saas',
      pricingModel: 'subscription',
      platforms: JSON.stringify(['web']),
      keywords: JSON.stringify(['a', 'b']),
      startingPriceCents: '1234',
      currencyCode: 'USD',
      ctaUrl: 'https://go',
      userId: 'user-1',
    });
  });

  it('toUpdatePayload maps values with normalization', () => {
    const values: any = {
      name: ' Name ',
      tagline: ' Tag ',
      description: ' Desc ',
      websiteUrl: 'example.com',
      logo: '/img',
      categoryId: 'cat',
      type: 'saas',
      pricingModel: 'subscription',
      platforms: ['web'],
      keywordsText: 'a, b, a',
      startingPriceCents: 1234,
      currencyCode: 'usd',
      ctaUrl: 'go',
    };
    const product: any = { userId: 'user-1' };
    const out = toUpdatePayload(values, product);
    expect(out).toMatchObject({
      name: 'Name',
      categoryId: 'cat',
      userId: 'user-1',
      description: ' Desc ',
      tagline: 'Tag',
      websiteUrl: 'https://example.com',
      logo: 'https:///img',
      type: 'saas',
      pricingModel: 'subscription',
      organizationId: null,
      startingPriceCents: 1234,
      currencyCode: 'USD',
      ctaLabel: null,
      ctaUrl: 'https://go',
      bannerImage: null,
      keywords: ['a', 'b'],
      platforms: ['web'],
      githubUrl: null,
      twitterUrl: null,
      demoUrl: null,
      contactEmail: null,
      utmCampaign: null,
    });
  });
});
