import { describe, it, expect } from 'vitest'
import { flushRender } from '../helpers/flush-render'

describe('flushRender', () => {
  it('should resolve without throwing', async () => {
    await expect(flushRender()).resolves.not.toThrow()
  })

  it('should complete the specified number of cycles', async () => {
    const cycles = 3
    let count = 0
    const g = globalThis as any
    const originalRAF = g.requestAnimationFrame
    g.requestAnimationFrame = (callback: FrameRequestCallback) => {
      count++
      if (typeof originalRAF === 'function') {
        return originalRAF(callback)
      } else {
        // Simulate rAF if not present
        return setTimeout(() => callback(performance.now()), 0)
      }
    }

    try {
      await flushRender(cycles)
      expect(count).toBe(cycles)
    } finally {
      g.requestAnimationFrame = originalRAF
    }
  })

  it('should handle zero cycles gracefully', async () => {
    await expect(flushRender(0)).resolves.not.toThrow()
  })
})
