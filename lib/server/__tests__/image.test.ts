import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toWebpIfPossible } from '@/lib/server/image';

beforeEach(() => {
  vi.resetModules();
});

vi.mock('sharp', () => ({
  default: (buf: Buffer) => ({
    webp: (_opts: any) => ({
      toBuffer: async () => {
        const size = (global as any).__webpSize ?? Math.floor(buf.length / 2);
        if ((global as any).__sharpThrow) throw new Error('boom');
        return Buffer.alloc(size);
      },
    }),
  }),
}));

describe('toWebpIfPossible', () => {
  it('keeps GIF/SVG untouched', async () => {
    const res = await toWebpIfPossible(new Uint8Array(100).buffer, 'image/gif');
    expect(res.contentType).toBe('image/gif');
    const res2 = await toWebpIfPossible(new Uint8Array(100).buffer, 'image/svg+xml');
    expect(res2.contentType).toBe('image/svg+xml');
  });

  it('converts to webp when smaller', async () => {
    (global as any).__webpSize = 10;
    const res = await toWebpIfPossible(new Uint8Array(100).buffer, 'image/png');
    expect(res.contentType).toBe('image/webp');
    expect(res.extension).toBe('webp');
  });

  it('keeps original when not smaller', async () => {
    (global as any).__webpSize = 200;
    const res = await toWebpIfPossible(new Uint8Array(100).buffer, 'image/png');
    expect(res.contentType).toBe('image/png');
  });

  it('falls back if sharp throws', async () => {
    (global as any).__sharpThrow = true;
    const res = await toWebpIfPossible(new Uint8Array(100).buffer, 'image/png');
    expect(res.contentType).toBe('image/png');
    delete (global as any).__sharpThrow;
  });
  it('uses bin extension for unknown mime', async () => {
    const res = await toWebpIfPossible(new Uint8Array(10).buffer, 'application/octet-stream');
    expect(res.extension).toBe('bin');
  });

  it('uses jpg extension for jpeg input', async () => {
    (global as any).__webpSize = 200;
    const res = await toWebpIfPossible(new Uint8Array(10).buffer, 'image/jpeg');
    expect(res.extension).toBe('jpg');
  });

  it('sets webp extension when keeping original webp', async () => {
    (global as any).__webpSize = 200; // force not smaller branch
    const res = await toWebpIfPossible(new Uint8Array(10).buffer, 'image/webp');
    expect(res.extension).toBe('webp');
  });

  it('falls back contentType default when mime empty (not smaller path)', async () => {
    (global as any).__webpSize = 200;
    // empty mime triggers default contentType fallback
    const res = await toWebpIfPossible(new Uint8Array(10).buffer, '');
    expect(res.contentType).toBe('application/octet-stream');
  });

  it('falls back contentType default when mime empty (catch path)', async () => {
    (global as any).__sharpThrow = true;
    const res = await toWebpIfPossible(new Uint8Array(10).buffer, '');
    expect(res.contentType).toBe('application/octet-stream');
    delete (global as any).__sharpThrow;
  });

});
