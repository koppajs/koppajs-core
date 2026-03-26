import { describe, it, expect, vi, beforeEach } from 'vitest'
import { kebabToCamel, evaluateExpression } from '../../src/utils/index'

describe('kebabToCamel', () => {
  it('converts kebab-case to camelCase', () => {
    expect(kebabToCamel('hello-world')).toBe('helloWorld')
    expect(kebabToCamel('my-component')).toBe('myComponent')
    expect(kebabToCamel('test-case-string')).toBe('testCaseString')
  })

  it('handles single word', () => {
    expect(kebabToCamel('hello')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(kebabToCamel('')).toBe('')
  })
})

describe('evaluateExpression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined for empty expression', () => {
    expect(evaluateExpression('')).toBeUndefined()
    expect(evaluateExpression('   ')).toBeUndefined()
  })

  it('blocks forbidden keywords', () => {
    expect(evaluateExpression('window', {})).toBeUndefined()
    expect(evaluateExpression('document', {})).toBeUndefined()
    expect(evaluateExpression('eval', {})).toBeUndefined()
    expect(evaluateExpression('this', {})).toBeUndefined()
  })

  it('evaluates simple path expressions', () => {
    const state = { name: 'test', value: 42 }
    expect(evaluateExpression('name', state)).toBe('test')
    expect(evaluateExpression('value', state)).toBe(42)
  })

  it('evaluates nested path expressions', () => {
    const state = { user: { name: 'John', age: 30 } }
    expect(evaluateExpression('user.name', state)).toBe('John')
    expect(evaluateExpression('user.age', state)).toBe(30)
  })

  it('calls functions with state as this context', () => {
    const state = {
      value: 10,
      getValue(this: any) {
        return this.value * 2
      },
    }
    expect(evaluateExpression('getValue', state)).toBe(20)
  })

  it('evaluates complex expressions', () => {
    const state = { a: 5, b: 10 }
    expect(evaluateExpression('a + b', state)).toBe(15)
    expect(evaluateExpression('a * b', state)).toBe(50)
  })

  it('returns undefined on evaluation error', () => {
    const state = {}
    expect(evaluateExpression('invalid.syntax.(', state)).toBeUndefined()
  })

  it('handles array access in paths', () => {
    const state = { items: [{ name: 'first' }, { name: 'second' }] }
    expect(evaluateExpression('items[0].name', state)).toBe('first')
  })

  // Three Test Rule: valid, error, and forbidden cases
  it('returns real boolean false for valid comparison', () => {
    expect(evaluateExpression('a > b', { a: 1, b: 2 })).toBe(false)
  })

  it('returns undefined for syntax error', () => {
    expect(evaluateExpression('invalid.syntax.(', {})).toBeUndefined()
  })

  it('returns undefined for forbidden keyword', () => {
    expect(evaluateExpression('window', {})).toBeUndefined()
  })
})
