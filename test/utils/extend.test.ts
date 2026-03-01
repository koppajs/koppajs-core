import { describe, it, expect } from 'vitest'
import { extend } from '../../src/utils/index.ts'

describe('extend', () => {
  it('extends Object.prototype with objectExtensions', () => {
    extend()
    // objectExtensions is empty, so we just verify it doesn't throw
    expect(() => extend()).not.toThrow()
  })

  it('extends HTMLElement.prototype with domExtensions when HTMLElement exists', () => {
    extend()

    const element = document.createElement('div')
    // Verify extensions are available (they may already be applied by other tests)
    expect(typeof (element as any).select).toBe('function')
    expect(typeof (element as any).addClass).toBe('function')
    expect(typeof (element as any).removeClass).toBe('function')
  })

  it('can be called multiple times safely', () => {
    extend()
    extend()
    extend()

    const element = document.createElement('div')
    expect(typeof (element as any).select).toBe('function')
  })

  it('does not throw in non-DOM environment', () => {
    // This test verifies the function handles missing HTMLElement gracefully
    // In jsdom environment, HTMLElement exists, so we can't fully test this
    // but we can verify it doesn't throw
    expect(() => extend()).not.toThrow()
  })
})
