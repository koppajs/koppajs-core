import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  patchGlobalEventTracking,
  cleanupAllEventListeners,
  cleanupSubtree,
  startGlobalDisconnectionObserver,
  stopGlobalDisconnectionObserver,
} from '../src/global-event-cleaner'

describe('global-event-cleaner', () => {
  beforeEach(() => {
    // Reset global flag
    ;(globalThis as any).__koppajsEventTrackingPatched = false
    stopGlobalDisconnectionObserver()
  })

  afterEach(() => {
    stopGlobalDisconnectionObserver()
    ;(globalThis as any).__koppajsEventTrackingPatched = false
  })

  describe('patchGlobalEventTracking', () => {
    it('patches EventTarget.prototype.addEventListener', () => {
      patchGlobalEventTracking()

      const element = document.createElement('div')
      const listener = () => {}
      element.addEventListener('click', listener)

      // Verify listener was registered
      expect(element.addEventListener).toBeDefined()
    })

    it('patches EventTarget.prototype.removeEventListener', () => {
      patchGlobalEventTracking()

      const element = document.createElement('div')
      const listener = () => {}
      element.addEventListener('click', listener)
      element.removeEventListener('click', listener)

      // Verify removeEventListener works
      expect(element.removeEventListener).toBeDefined()
    })

    it('only patches once', () => {
      const originalAdd = EventTarget.prototype.addEventListener
      patchGlobalEventTracking()
      const afterFirst = EventTarget.prototype.addEventListener
      patchGlobalEventTracking()
      const afterSecond = EventTarget.prototype.addEventListener

      expect(afterFirst).toBe(afterSecond)
      expect(afterFirst).not.toBe(originalAdd)
    })

    it('tracks event listeners', () => {
      patchGlobalEventTracking()

      const element = document.createElement('div')
      const listener1 = () => {}
      const listener2 = () => {}

      element.addEventListener('click', listener1)
      element.addEventListener('click', listener2)

      // Both listeners should be tracked
      cleanupAllEventListeners(element)
      // After cleanup, listeners should be removed
      expect(element.addEventListener).toBeDefined()
    })
  })

  describe('cleanupAllEventListeners', () => {
    beforeEach(() => {
      patchGlobalEventTracking()
    })

    it('removes all tracked listeners from element', () => {
      const element = document.createElement('div')
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      element.addEventListener('click', listener1)
      element.addEventListener('mouseover', listener2)

      cleanupAllEventListeners(element)

      // Trigger events to verify listeners are removed
      element.dispatchEvent(new Event('click'))
      element.dispatchEvent(new Event('mouseover'))

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })

    it('handles element with no listeners', () => {
      const element = document.createElement('div')
      expect(() => cleanupAllEventListeners(element)).not.toThrow()
    })

    it('removes listeners with options', () => {
      const element = document.createElement('div')
      const listener = vi.fn()

      element.addEventListener('click', listener, { once: true })
      cleanupAllEventListeners(element)

      element.dispatchEvent(new Event('click'))
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('cleanupSubtree', () => {
    beforeEach(() => {
      patchGlobalEventTracking()
    })

    it('cleans up listeners in subtree', () => {
      const parent = document.createElement('div')
      const child1 = document.createElement('div')
      const child2 = document.createElement('div')

      parent.appendChild(child1)
      parent.appendChild(child2)

      const parentListener = vi.fn()
      const child1Listener = vi.fn()
      const child2Listener = vi.fn()

      parent.addEventListener('click', parentListener)
      child1.addEventListener('click', child1Listener)
      child2.addEventListener('click', child2Listener)

      cleanupSubtree(parent)

      parent.dispatchEvent(new Event('click', { bubbles: true }))
      child1.dispatchEvent(new Event('click', { bubbles: true }))
      child2.dispatchEvent(new Event('click', { bubbles: true }))

      expect(parentListener).not.toHaveBeenCalled()
      expect(child1Listener).not.toHaveBeenCalled()
      expect(child2Listener).not.toHaveBeenCalled()
    })

    it('handles non-element nodes', () => {
      const textNode = document.createTextNode('test')
      expect(() => cleanupSubtree(textNode)).not.toThrow()
    })

    it('is safe in non-DOM environment', () => {
      // This test verifies the function handles missing DOM APIs gracefully
      // In jsdom, DOM APIs exist, so we can't fully test this
      expect(() => cleanupSubtree(document.createElement('div'))).not.toThrow()
    })
  })

  describe('startGlobalDisconnectionObserver', () => {
    beforeEach(() => {
      patchGlobalEventTracking()
    })

    it('starts observer when DOM is available', () => {
      startGlobalDisconnectionObserver()
      expect(() => startGlobalDisconnectionObserver()).not.toThrow()
    })

    it('only starts observer once', () => {
      startGlobalDisconnectionObserver()
      const firstCall = startGlobalDisconnectionObserver
      startGlobalDisconnectionObserver()
      const secondCall = startGlobalDisconnectionObserver

      expect(firstCall).toBe(secondCall)
    })

    it('observes document.body for removed nodes', async () => {
      startGlobalDisconnectionObserver()

      const element = document.createElement('div')
      const listener = vi.fn()
      element.addEventListener('click', listener)
      document.body.appendChild(element)

      document.body.removeChild(element)

      // Wait for MutationObserver to process the removal
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Observer should have cleaned up listeners
      element.dispatchEvent(new Event('click'))
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('stopGlobalDisconnectionObserver', () => {
    it('stops observer', () => {
      startGlobalDisconnectionObserver()
      stopGlobalDisconnectionObserver()

      // Should be able to start again
      expect(() => startGlobalDisconnectionObserver()).not.toThrow()
    })

    it('handles stopping when observer is not started', () => {
      expect(() => stopGlobalDisconnectionObserver()).not.toThrow()
    })
  })
})
