import { describe, it, expect, vi } from 'vitest'
import { createModel } from '../src/model'
import { flushMicrotasks } from './setup'

describe('createModel', () => {
  describe('basic reactivity', () => {
    it('creates reactive model', () => {
      const model = createModel({ count: 0 })
      expect(model.state.count).toBe(0)
    })

    it('notifies observers on property change', async () => {
      const model = createModel({ count: 0 })
      const observer = vi.fn()
      model.addObserver(observer)

      model.state.count = 10
      await flushMicrotasks()
      expect(observer).toHaveBeenCalled()
    })

    it("does not notify when value doesn't change", () => {
      const model = createModel({ count: 0 })
      const observer = vi.fn()
      model.addObserver(observer)

      model.state.count = 0
      expect(observer).not.toHaveBeenCalled()
    })
  })

  describe('watch - effect subscriptions', () => {
    it('watches path prefix and batches notifications', () => {
      const model = createModel({ user: { name: 'John', age: 30 } })
      const watchCallback = vi.fn()
      const stop = model.watch('user', watchCallback)

      model.state.user.name = 'Jane'
      model.state.user.age = 31

      // Changes are accumulated in changedPaths
      model.flushChanges()
      expect(watchCallback).toHaveBeenCalledWith({
        changedPaths: expect.any(Set),
      })

      // Cleanup works
      expect(typeof stop).toBe('function')
    })

    it('uses prefix-matching for watchers', () => {
      const model = createModel({
        user: { name: 'John', details: { age: 30 } },
      })
      const watchCallback = vi.fn()
      model.watch('user', watchCallback)

      // Both direct and nested changes match the prefix
      model.state.user.name = 'Jane'
      model.state.user.details.age = 31

      model.flushChanges()
      expect(watchCallback).toHaveBeenCalled()

      const info = watchCallback.mock.calls[0][0]
      expect(info.changedPaths).toContain('user.name')
      expect(info.changedPaths).toContain('user.details.age')
    })

    it('receives only matching paths in callback', () => {
      const model = createModel({
        user: { name: 'John' },
        settings: { theme: 'dark' },
      })
      const userWatcher = vi.fn()
      const settingsWatcher = vi.fn()

      model.watch('user', userWatcher)
      model.watch('settings', settingsWatcher)

      model.state.user.name = 'Jane'
      model.state.settings.theme = 'light'

      model.flushChanges()
      expect(userWatcher).toHaveBeenCalled()
      expect(settingsWatcher).toHaveBeenCalled()

      // Each watcher should only receive its matching paths
      const userInfo = userWatcher.mock.calls[0][0]
      expect(userInfo.changedPaths).toContain('user.name')
      expect(userInfo.changedPaths).not.toContain('settings.theme')

      const settingsInfo = settingsWatcher.mock.calls[0][0]
      expect(settingsInfo.changedPaths).toContain('settings.theme')
      expect(settingsInfo.changedPaths).not.toContain('user.name')
    })

    it('returns idempotent cleanup function', () => {
      const model = createModel({ count: 0 })
      const watchCallback = vi.fn()
      const stop = model.watch('count', watchCallback)

      stop()
      stop() // Calling stop again should be safe
      expect(() => stop()).not.toThrow()
    })

    it('cleanup function unregisters watcher', () => {
      const model = createModel({ count: 0 })
      const watchCallback = vi.fn()
      const stop = model.watch('count', watchCallback)

      model.state.count = 1
      model.flushChanges()
      expect(watchCallback).toHaveBeenCalledTimes(1)

      stop()

      model.state.count = 2
      model.flushChanges()
      expect(watchCallback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('batches watcher callbacks once per flush cycle', () => {
      const model = createModel({ user: { name: 'John', age: 30 } })
      const watchCallback = vi.fn()
      model.watch('user', watchCallback)

      model.state.user.name = 'Jane'
      model.state.user.age = 31
      model.state.user.name = 'Bob'

      // Even though we changed 3 times, callback is only called once per flush
      model.flushChanges()
      expect(watchCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('watchers do not affect rendering', () => {
    it('observers still drive rendering independently', async () => {
      const model = createModel({ count: 0 })
      const observer = vi.fn()
      const watchCallback = vi.fn()

      model.addObserver(observer)
      model.watch('count', watchCallback)

      model.state.count = 10

      // Both observer and watcher callback should be called
      await flushMicrotasks()
      expect(observer).toHaveBeenCalled()
      expect(watchCallback).not.toHaveBeenCalled() // Not yet, needs flush
    })
  })

  describe('array handling', () => {
    it('handles array replacement', async () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      model.state.items = [4, 5, 6]
      await flushMicrotasks()
      expect(observer).toHaveBeenCalled()
    })

    it('updates stored array content when items are added', async () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      model.state.items = [1, 2, 3, 4]

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([1, 2, 3, 4])
    })

    it('updates stored array content when items are removed', async () => {
      const model = createModel({ items: [1, 2, 3, 4] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      model.state.items = [1, 2]

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([1, 2])
    })

    it('does not notify when array is set to same contents', () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      const originalContent = Array.from(originalArray)
      model.state.items = [1, 2, 3]

      // Observer should not be notified
      expect(observer).not.toHaveBeenCalled()

      // Array reference should remain the same
      expect(model.state.items).toBe(originalArray)
      // Content should remain unchanged
      expect(Array.from(model.state.items)).toEqual(originalContent)
    })

    it('does not notify when array is set to same contents (different reference)', () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      // Create a new array with same contents
      model.state.items = [1, 2, 3]

      // Observer should not be notified (no actual changes)
      expect(observer).not.toHaveBeenCalled()

      // Array should still be the same reference (no mutation occurred)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([1, 2, 3])
    })

    it('updates stored array content when items are reordered and changed', async () => {
      const model = createModel({ items: [1, 2, 3, 4] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      // Reorder and change: [1, 2, 3, 4] -> [4, 5, 2, 1]
      model.state.items = [4, 5, 2, 1]

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([4, 5, 2, 1])
    })

    it('updates stored array content with mixed add/remove/reorder', async () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      // Complex change: [1, 2, 3] -> [5, 2, 7, 1]
      model.state.items = [5, 2, 7, 1]

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([5, 2, 7, 1])
    })

    it('handles empty array replacement', async () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      model.state.items = []

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([])
    })

    it('handles replacement of empty array with items', async () => {
      const model = createModel({ items: [] })
      const observer = vi.fn()
      model.addObserver(observer)

      const originalArray = model.state.items
      model.state.items = [1, 2, 3]

      // Observer should be notified exactly once
      await flushMicrotasks()
      expect(observer).toHaveBeenCalledTimes(1)

      // Array should be updated in place (same reference)
      expect(model.state.items).toBe(originalArray)
      expect(Array.from(model.state.items)).toEqual([1, 2, 3])
    })
  })

  describe('object merging', () => {
    it('merges objects in place', async () => {
      const model = createModel({ user: { name: 'John', age: 30 } })
      const observer = vi.fn()
      model.addObserver(observer)

      model.state.user = { name: 'Jane', age: 25 }
      await flushMicrotasks()
      expect(observer).toHaveBeenCalled()
      expect(model.state.user.name).toBe('Jane')
    })
  })

  describe('flushChanges', () => {
    it('returns changed paths since last flush', () => {
      const model = createModel({ a: 1, b: 2 })

      model.state.a = 10
      model.state.b = 20

      const changed = model.flushChanges()
      expect(changed).toContain('a')
      expect(changed).toContain('b')
    })

    it('clears changed paths after flush', () => {
      const model = createModel({ count: 0 })

      model.state.count = 1
      model.flushChanges()

      const changed = model.flushChanges()
      expect(changed.size).toBe(0)
    })
  })

  describe('removeObserver', () => {
    it('removes observer', () => {
      const model = createModel({ count: 0 })
      const observer = vi.fn()
      model.addObserver(observer)
      model.removeObserver(observer)

      model.state.count = 10
      expect(observer).not.toHaveBeenCalled()
    })
  })
})
