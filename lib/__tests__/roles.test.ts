import { describe, it, expect, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ sessionClaims: { metadata: { role: 'admin' } } }),
}));

import { checkRole } from '@/lib/roles';

describe('roles.checkRole', () => {
  it('compares role from session claims', async () => {
    await expect(checkRole('admin' as any)).resolves.toBe(true);
    await expect(checkRole('member' as any)).resolves.toBe(false);
  });
});

