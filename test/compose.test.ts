import { describe, it, expect } from 'vitest'
import { composeBySource } from '../src/compose'

describe('composeBySource', () => {
  it('creates composed object from multiple layers', () => {
    const layer1: Record<string, number> = { a: 1, b: 2 }
    const layer2: Record<string, number> = { c: 3, d: 4 }
    const composed = composeBySource([layer1, layer2])

    expect(composed.a).toBe(1)
    expect(composed.b).toBe(2)
    expect(composed.c).toBe(3)
    expect(composed.d).toBe(4)
  })

  it('reads from first layer that has property', () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { a: 2, b: 3 }
    const composed = composeBySource([layer1, layer2])

    expect(composed.a).toBe(1) // from layer1
    expect(composed.b).toBe(3) // from layer2
  })

  it('writes to layer where property exists', () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { b: 2 }
    const composed = composeBySource([layer1, layer2])

    composed.a = 10
    composed.b = 20

    expect(layer1.a).toBe(10)
    expect(layer2.b).toBe(20)
  })

  it("writes to defaultWriteIndex when property doesn't exist", () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { b: 2 }
    const composed = composeBySource([layer1, layer2])

    composed.c = 3 // doesn't exist in any layer
    expect(layer2.c).toBe(3) // defaultWriteIndex is last layer
  })

  it('allows custom defaultWriteIndex', () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { b: 2 }
    const composed = composeBySource([layer1, layer2], {
      defaultWriteIndex: 0,
    })

    composed.c = 3
    expect(layer1.c).toBe(3)
  })

  it('handles property deletion', () => {
    const layer1: Record<string, number> = { a: 1, b: 2 }
    const layer2: Record<string, number> = { c: 3 }
    const composed = composeBySource([layer1, layer2])

    delete composed.a
    expect('a' in layer1).toBe(false)
  })

  it("checks property existence with 'in' operator", () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { b: 2 }
    const composed = composeBySource([layer1, layer2])

    expect('a' in composed).toBe(true)
    expect('b' in composed).toBe(true)
    expect('c' in composed).toBe(false)
  })

  it('returns all keys with Object.keys', () => {
    const layer1: Record<string, number> = { a: 1 }
    const layer2: Record<string, number> = { b: 2 }
    const composed = composeBySource([layer1, layer2])

    const keys = Object.keys(composed)
    expect(keys).toContain('a')
    expect(keys).toContain('b')
  })

  it('throws error for empty layers array', () => {
    expect(() => composeBySource([])).toThrow()
  })

  it('throws error for null layer', () => {
    expect(() => composeBySource([null as any])).toThrow()
  })

  it('handles includePrototype option', () => {
    class Base {
      baseProp = 'base'
    }
    class Derived extends Base {
      derivedProp = 'derived'
    }
    const instance = new Derived()
    const layer = { ownProp: 'own' }

    const composed = composeBySource([layer, instance], {
      includePrototype: true,
    })
    expect('baseProp' in composed).toBe(true)
  })
})
