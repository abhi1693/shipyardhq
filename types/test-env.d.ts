import "vitest"
import "@testing-library/jest-dom/vitest"
import "jest"

import type { expect as vitestExpect, vi as vitestVi } from "vitest"

declare module "@vitest/expect" {}

declare global {
  namespace Chai {
    interface Assertion<T = any> {
      toBe(expected: T): Assertion<T>
      toEqual<E>(expected: E): Assertion<T>
      toMatch(expected: string | RegExp): Assertion<T>
      toMatchObject<E extends object | any[]>(expected: E): Assertion<T>
      toBeTruthy(): Assertion<T>
      toBeFalsy(): Assertion<T>
      toBeNull(): Assertion<T>
      toBeDefined(): Assertion<T>
      toBeUndefined(): Assertion<T>
      toBeNaN(): Assertion<T>
      toBeGreaterThan(expected: number | bigint): Assertion<T>
      toBeGreaterThanOrEqual(expected: number | bigint): Assertion<T>
      toBeLessThan(expected: number | bigint): Assertion<T>
      toBeLessThanOrEqual(expected: number | bigint): Assertion<T>
      toHaveLength(expected: number): Assertion<T>
      toHaveAttribute(name: string, value?: string | RegExp): Assertion<T>
      toContain<E>(item: E): Assertion<T>
      toContainEqual<E>(item: E): Assertion<T>
      toHaveTextContent(
        text: string | RegExp,
        options?: { normalizeWhitespace?: boolean },
      ): Assertion<T>
      toBeInTheDocument(): Assertion<T>
      toHaveBeenCalled(): Assertion<T>
      toHaveBeenCalledTimes(expected: number): Assertion<T>
      toHaveBeenCalledWith(...args: any[]): Assertion<T>
      toHaveBeenNthCalledWith(nthCall: number, ...args: any[]): Assertion<T>
    }
  }

  const expect: typeof vitestExpect
  const vi: typeof vitestVi
}
