import { describe, it, expect, vi } from 'vitest'
import { createModel } from '../src/model'

describe('model.watch - batching and prefix semantics', () => {
  describe('positive (prefix + batching)', () => {
    it('batches multiple mutations under same prefix in single tick', () => {
      const model = createModel({
        user: { name: 'John', age: 30 },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // Mutate multiple properties of user in the same tick
      model.state.user.name = 'Jane'
      model.state.user.age = 31

      // Flush once
      model.flushChanges()

      // Callback should be called exactly once
      expect(callback).toHaveBeenCalledTimes(1)

      // Both changed paths should be present
      const info = callback.mock.calls[0][0]
      expect(info.changedPaths.size).toBe(2)
      expect(info.changedPaths.has('user.name')).toBe(true)
      expect(info.changedPaths.has('user.age')).toBe(true)
    })

    it('batches deeply nested mutations under same prefix', () => {
      const model = createModel({
        user: {
          profile: { name: 'John', bio: 'Developer' },
          settings: { theme: 'dark' },
        },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // Mutate nested paths
      model.state.user.profile.name = 'Jane'
      model.state.user.settings.theme = 'light'

      model.flushChanges()

      expect(callback).toHaveBeenCalledTimes(1)

      const info = callback.mock.calls[0][0]
      expect(info.changedPaths.has('user.profile.name')).toBe(true)
      expect(info.changedPaths.has('user.settings.theme')).toBe(true)
    })

    it('batches mutations across multiple flush cycles', () => {
      const model = createModel({
        user: { name: 'John', age: 30 },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // First tick
      model.state.user.name = 'Jane'
      model.flushChanges()

      expect(callback).toHaveBeenCalledTimes(1)
      let info = callback.mock.calls[0][0]
      expect(info.changedPaths.has('user.name')).toBe(true)

      // Second tick
      model.state.user.age = 31
      model.flushChanges()

      expect(callback).toHaveBeenCalledTimes(2)
      info = callback.mock.calls[1][0]
      expect(info.changedPaths.has('user.age')).toBe(true)
      // Previous changes should not be included
      expect(info.changedPaths.has('user.name')).toBe(false)
    })
  })

  describe('negative (unrelated paths)', () => {
    it('does not trigger callback for unrelated path mutations', () => {
      const model = createModel({
        user: { name: 'John' },
        settings: { theme: 'dark' },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // Mutate unrelated path
      model.state.settings.theme = 'light'

      model.flushChanges()

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger callback for sibling path mutations', () => {
      const model = createModel({
        user: { name: 'John' },
        admin: { name: 'Admin' },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // Mutate sibling path
      model.state.admin.name = 'SuperAdmin'

      model.flushChanges()

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not trigger callback when no mutations occur', () => {
      const model = createModel({
        user: { name: 'John' },
      })
      const callback = vi.fn()

      model.watch('user', callback)

      // Flush without any mutations
      model.flushChanges()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('edge (specific path watcher)', () => {
    it('only receives matching nested paths for specific watcher', () => {
      const model = createModel({
        user: {
          name: { first: 'John', last: 'Doe' },
          age: 30,
        },
      })
      const callback = vi.fn()

      // Watch specific nested path
      model.watch('user.name', callback)

      // Mutate both matching and non-matching paths
      model.state.user.name.first = 'Jane'
      model.state.user.age = 31

      model.flushChanges()

      // Callback should be called once
      expect(callback).toHaveBeenCalledTimes(1)

      // Only the matching path should be included
      const info = callback.mock.calls[0][0]
      expect(info.changedPaths.has('user.name.first')).toBe(true)
      expect(info.changedPaths.has('user.age')).toBe(false)
    })

    it('watches exact path match', () => {
      const model = createModel({
        user: { name: 'John' },
      })
      const callback = vi.fn()

      model.watch('user.name', callback)

      // Exact match
      model.state.user.name = 'Jane'

      model.flushChanges()

      expect(callback).toHaveBeenCalledTimes(1)

      const info = callback.mock.calls[0][0]
      expect(info.changedPaths.has('user.name')).toBe(true)
    })

    it('specific watcher does not match parent path changes', () => {
      const model = createModel({
        user: { name: 'John', age: 30 },
      })
      const callback = vi.fn()

      // Watch nested path
      model.watch('user.name', callback)

      // Mutate parent but not the watched nested path
      model.state.user.age = 31

      model.flushChanges()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('cleanup (stop function)', () => {
    it('stops receiving updates after calling stop()', () => {
      const model = createModel({
        user: { name: 'John' },
      })
      const callback = vi.fn()

      const stop = model.watch('user', callback)

      // Mutate before stop
      model.state.user.name = 'Jane'
      model.flushChanges()

      expect(callback).toHaveBeenCalledTimes(1)

      // Call stop
      stop()

      // Mutate after stop
      model.state.user.name = 'Bob'
      model.flushChanges()

      // Should not have been called again
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('stop() is idempotent', () => {
      const model = createModel({
        user: { name: 'John' },
      })
      const callback = vi.fn()

      const stop = model.watch('user', callback)

      // Call stop multiple times
      stop()
      stop()
      stop()

      // Mutate after multiple stops
      model.state.user.name = 'Jane'
      model.flushChanges()

      // Should not have been called
      expect(callback).not.toHaveBeenCalled()
    })

    it('removes watcher from registry after stop()', () => {
      const model = createModel({
        user: { name: 'John' },
      })
      const callback = vi.fn()

      const stop = model.watch('user', callback)

      stop()

      // Mutate and flush
      model.state.user.name = 'Jane'
      const changedPaths = model.flushChanges()

      // Path should still be tracked
      expect(changedPaths.has('user.name')).toBe(true)
      // But callback should not be called
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('multiple watchers', () => {
    it('calls multiple watchers for overlapping prefixes', () => {
      const model = createModel({
        user: { name: 'John', age: 30 },
      })
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      model.watch('user', callback1)
      model.watch('user.name', callback2)

      model.state.user.name = 'Jane'

      model.flushChanges()

      // Both should be called
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)

      // First watcher gets the change
      const info1 = callback1.mock.calls[0][0]
      expect(info1.changedPaths.has('user.name')).toBe(true)

      // Second watcher also gets the change
      const info2 = callback2.mock.calls[0][0]
      expect(info2.changedPaths.has('user.name')).toBe(true)
    })

    it('each watcher receives only matching paths', () => {
      const model = createModel({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      })
      const userCallback = vi.fn()
      const settingsCallback = vi.fn()

      model.watch('user', userCallback)
      model.watch('settings', settingsCallback)

      model.state.user.name = 'Jane'
      model.state.settings.theme = 'light'

      model.flushChanges()

      expect(userCallback).toHaveBeenCalledTimes(1)
      expect(settingsCallback).toHaveBeenCalledTimes(1)

      const userInfo = userCallback.mock.calls[0][0]
      expect(userInfo.changedPaths.has('user.name')).toBe(true)
      expect(userInfo.changedPaths.has('settings.theme')).toBe(false)

      const settingsInfo = settingsCallback.mock.calls[0][0]
      expect(settingsInfo.changedPaths.has('settings.theme')).toBe(true)
      expect(settingsInfo.changedPaths.has('user.name')).toBe(false)
    })
  })
})
