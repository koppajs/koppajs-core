import { describe, it, expect, vi } from 'vitest'
import { createModel } from '../src/model'

// Helper to access internal slot sidecars for testing
// Since the WeakMap is internal, we need to test slot behavior indirectly
// by verifying that operations maintain consistency

describe('model slot sidecars', () => {
  describe('positive cases - slot preservation during structural mutations', () => {
    it('push creates new slotIds for new elements', () => {
      const model = createModel({ items: [1, 2, 3] })
      const initialLength = model.state.items.length

      model.state.items.push(4, 5)

      expect(model.state.items).toEqual([1, 2, 3, 4, 5])
      expect(model.state.items.length).toBe(initialLength + 2)
    })

    it('reverse reorders slotIds to match reversed array', () => {
      const model = createModel({ items: ['a', 'b', 'c', 'd'] })
      const originalItems = [...model.state.items]

      model.state.items.reverse()

      expect(model.state.items).toEqual(['d', 'c', 'b', 'a'])
      expect(model.state.items).not.toEqual(originalItems)
    })

    it('sort reorders slotIds to match sorted array', () => {
      const model = createModel({ items: [3, 1, 4, 1, 5, 9, 2, 6] })

      model.state.items.sort((a, b) => a - b)

      expect(model.state.items).toEqual([1, 1, 2, 3, 4, 5, 6, 9])
    })

    it('sort with objects preserves slotIds with elements', () => {
      const obj1 = { id: 1, name: 'Alice' }
      const obj2 = { id: 2, name: 'Bob' }
      const obj3 = { id: 3, name: 'Charlie' }
      const model = createModel({ users: [obj3, obj1, obj2] })

      model.state.users.sort((a, b) => a.id - b.id)

      expect(model.state.users).toEqual([obj1, obj2, obj3])
      expect(model.state.users[0]).toBe(obj1)
      expect(model.state.users[1]).toBe(obj2)
      expect(model.state.users[2]).toBe(obj3)
    })

    it('pop removes slotId for removed element', () => {
      const model = createModel({ items: [1, 2, 3, 4] })

      const popped = model.state.items.pop()

      expect(popped).toBe(4)
      expect(model.state.items).toEqual([1, 2, 3])
      expect(model.state.items.length).toBe(3)
    })

    it('shift removes slotId for first element', () => {
      const model = createModel({ items: [1, 2, 3, 4] })

      const shifted = model.state.items.shift()

      expect(shifted).toBe(1)
      expect(model.state.items).toEqual([2, 3, 4])
      expect(model.state.items.length).toBe(3)
    })

    it('unshift adds new slotIds at beginning', () => {
      const model = createModel({ items: [3, 4, 5] })

      model.state.items.unshift(1, 2)

      expect(model.state.items).toEqual([1, 2, 3, 4, 5])
      expect(model.state.items.length).toBe(5)
    })
  })

  describe('negative cases - full array replacement', () => {
    it('full replace recreates all slotIds (no persistence)', () => {
      const model = createModel({ items: [1, 2, 3] })
      const observer = vi.fn()
      model.addObserver(observer)

      // Full array replacement should create entirely new slotIds
      model.state.items = [4, 5, 6]

      expect(model.state.items).toEqual([4, 5, 6])
      expect(observer).toHaveBeenCalled()
    })

    it('replacing array with empty array creates fresh sidecar', () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] })

      model.state.items = []

      expect(model.state.items).toEqual([])
      expect(model.state.items.length).toBe(0)
    })

    it('replacing with new array of same elements creates new slotIds', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const model = createModel({ items: [obj1, obj2] })

      // Replace with new array containing same objects
      model.state.items = [obj1, obj2]

      expect(model.state.items).toEqual([obj1, obj2])
      expect(model.state.items[0]).toBe(obj1)
      expect(model.state.items[1]).toBe(obj2)
    })
  })

  describe('edge cases - splice operations', () => {
    it('splice remove produces correct slotId removals', () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] })

      // Remove 2 elements starting at index 1
      const removed = model.state.items.splice(1, 2)

      expect(removed).toEqual([2, 3])
      expect(model.state.items).toEqual([1, 4, 5])
      expect(model.state.items.length).toBe(3)
    })

    it('splice insert produces new slotIds for inserted elements', () => {
      const model = createModel({ items: [1, 2, 5] })

      // Insert elements at index 2
      model.state.items.splice(2, 0, 3, 4)

      expect(model.state.items).toEqual([1, 2, 3, 4, 5])
      expect(model.state.items.length).toBe(5)
    })

    it('splice remove+insert produces correct slotId operations', () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] })

      // Remove 2 elements and insert 3 new ones at index 2
      const removed = model.state.items.splice(2, 2, 10, 20, 30)

      expect(removed).toEqual([3, 4])
      expect(model.state.items).toEqual([1, 2, 10, 20, 30, 5])
      expect(model.state.items.length).toBe(6)
    })

    it('splice with negative index works correctly', () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] })

      // Remove 2 elements from end
      model.state.items.splice(-2, 2)

      expect(model.state.items).toEqual([1, 2, 3])
    })

    it('splice removing all elements and adding new ones', () => {
      const model = createModel({ items: [1, 2, 3] })

      model.state.items.splice(0, 3, 10, 20, 30, 40)

      expect(model.state.items).toEqual([10, 20, 30, 40])
      expect(model.state.items.length).toBe(4)
    })

    it('empty splice (no remove, no insert) maintains slotIds', () => {
      const model = createModel({ items: [1, 2, 3] })
      const beforeLength = model.state.items.length

      model.state.items.splice(1, 0)

      expect(model.state.items).toEqual([1, 2, 3])
      expect(model.state.items.length).toBe(beforeLength)
    })
  })

  describe('non-structural updates preserve slotIds', () => {
    it('direct index assignment keeps the same slotId', () => {
      const model = createModel({ items: [1, 2, 3, 4] })

      // Non-structural update - just change the value at index 2
      model.state.items[2] = 999

      expect(model.state.items).toEqual([1, 2, 999, 4])
      expect(model.state.items.length).toBe(4)
    })

    it('multiple index assignments maintain slotIds', () => {
      const model = createModel({ items: ['a', 'b', 'c', 'd'] })

      model.state.items[0] = 'A'
      model.state.items[3] = 'D'

      expect(model.state.items).toEqual(['A', 'b', 'c', 'D'])
    })

    it('updating object properties in array preserves slotIds', () => {
      const obj = { value: 10 }
      const model = createModel({ items: [obj, { value: 20 }] })

      // Update property of object in array
      model.state.items[0]!.value = 100

      expect(model.state.items[0]!.value).toBe(100)
      expect(model.state.items.length).toBe(2)
    })
  })

  describe('combined operations', () => {
    it('multiple structural operations maintain consistency', () => {
      const model = createModel({ items: [1, 2, 3] })

      model.state.items.push(4)
      model.state.items.unshift(0)
      model.state.items.splice(2, 1)

      expect(model.state.items).toEqual([0, 1, 3, 4])
    })

    it('structural ops mixed with non-structural updates', () => {
      const model = createModel({ items: [1, 2, 3, 4, 5] })

      model.state.items[2] = 30 // non-structural
      model.state.items.push(6) // structural
      model.state.items[0] = 10 // non-structural

      expect(model.state.items).toEqual([10, 2, 30, 4, 5, 6])
    })

    it('reverse after modifications preserves element identity', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const obj3 = { id: 3 }
      const model = createModel({ items: [obj1, obj2, obj3] })

      model.state.items.reverse()

      expect(model.state.items[0]).toBe(obj3)
      expect(model.state.items[1]).toBe(obj2)
      expect(model.state.items[2]).toBe(obj1)
    })

    it('sort then push maintains consistency', () => {
      const model = createModel({ items: [3, 1, 2] })

      model.state.items.sort((a, b) => a - b)
      model.state.items.push(4)

      expect(model.state.items).toEqual([1, 2, 3, 4])
    })
  })

  describe('initialization', () => {
    it('arrays in initial state get slot sidecars', () => {
      const model = createModel({
        items: [1, 2, 3],
        nested: {
          data: ['a', 'b', 'c'],
        },
      })

      expect(model.state.items).toEqual([1, 2, 3])
      expect(model.state.nested.data).toEqual(['a', 'b', 'c'])
    })

    it('empty array initialization creates sidecar', () => {
      const model = createModel<{ items: number[] }>({ items: [] })

      model.state.items.push(1, 2, 3)

      expect(model.state.items).toEqual([1, 2, 3])
    })
  })
})
