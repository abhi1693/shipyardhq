import { describe, it, expect } from 'vitest';
import { makeAddProductSchema, makeEditProductSchema } from '@/lib/productWizard/schema';

function baseValid(overrides: Partial<Record<string, any>> = {}) {
  return {
    name: 'Test',
    tagline: 'Tag',
    description: 'Desc',
    websiteUrl: 'https://example.com',
    logo: 'https://example.com/logo.png',
    categoryId: 'cat_1',
    type: 'saas',
    platforms: ['web'],
    keywordsText: '',
    pricingModel: 'freemium',
    startingPriceCents: null,
    currencyCode: null,
    organizationId: undefined,
    ctaLabel: undefined,
    ctaUrl: '',
    bannerImage: '',
    githubUrl: '',
    twitterUrl: '',
    demoUrl: '',
    contactEmail: '',
    utmCampaign: '',
    status: 'draft',
    verificationExpectedTxt: undefined,
    verificationChecked: undefined,
    verificationSuccess: undefined,
    reviewIssues: [],
    reviewChecks: {},
    ...overrides,
  } as any;
}

describe('productWizard schema', () => {
  it('accepts valid freemium without price/currency', () => {
    const s = makeAddProductSchema();
    const parsed = s.parse(baseValid());
    expect(parsed.name).toBe('Test');
  });

  it('requires price and currency for subscription', () => {
    const s = makeAddProductSchema();
    const res = s.safeParse(baseValid({ pricingModel: 'subscription' }));
    expect(res.success).toBe(false);
    const errs = (res as any).error.issues.map((i: any) => i.path.join('.') + ':' + i.message);
    expect(errs.some((m: string) => m.includes('startingPriceCents') && m.includes('Price required'))).toBe(true);
    expect(errs.some((m: string) => m.includes('currencyCode') && m.includes('Currency required'))).toBe(true);
  });

  it('rejects price/currency for free', () => {
    const s = makeAddProductSchema();
    const res = s.safeParse(
      baseValid({ pricingModel: 'free', startingPriceCents: 100, currencyCode: 'USD' }),
    );
    expect(res.success).toBe(false);
    const msgs = (res as any).error.issues.map((i: any) => i.message);
    expect(msgs).toContain('Should be empty for free/custom');
  });

  it('allows archived status in edit schema only', () => {
    const add = makeAddProductSchema();
    const edit = makeEditProductSchema();
    expect(add.safeParse(baseValid({ status: 'archived' })).success).toBe(false);
    expect(edit.safeParse(baseValid({ status: 'archived' })).success).toBe(true);
  });
});

