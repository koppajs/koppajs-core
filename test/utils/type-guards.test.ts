import { describe, it, expect } from 'vitest'
import {
  isComponentSource,
  isPlugin,
  isModule,
  isHTMLElementWithInstance,
  hasComponentInstance,
  isValidLoopMatch,
} from '../../src/utils/index.ts'
import type { ComponentSource, IPlugin, IModule } from '../../src/types'

describe('type-guards', () => {
  describe('isComponentSource', () => {
    it('returns true for valid ComponentSource', () => {
      const source: ComponentSource = {
        template: '<div></div>',
        script: 'return {}',
        style: 'div { color: red; }',
      }
      expect(isComponentSource(source)).toBe(true)
    })

    it('returns false for invalid object', () => {
      expect(isComponentSource({})).toBe(false)
      expect(isComponentSource({ template: 'test' })).toBe(false)
      expect(isComponentSource(null)).toBe(false)
      expect(isComponentSource(undefined)).toBe(false)
    })
  })

  describe('isPlugin', () => {
    it('returns true for valid plugin', () => {
      const plugin: IPlugin = {
        name: 'test',
        setup() {
          return {}
        },
        install() {},
        attach: undefined as never,
      }
      expect(isPlugin(plugin)).toBe(true)
    })

    it('returns false for module', () => {
      const module: IModule = {
        name: 'test',
        attach() {},
        install() {},
      }
      expect(isPlugin(module)).toBe(false)
    })

    it('returns false for invalid object', () => {
      expect(isPlugin({})).toBe(false)
      expect(isPlugin({ name: 'test' })).toBe(false)
    })
  })

  describe('isModule', () => {
    it('returns true for valid module', () => {
      const module: IModule = {
        name: 'test',
        attach() {},
        install() {},
      }
      expect(isModule(module)).toBe(true)
    })

    it('returns false for plugin', () => {
      const plugin: IPlugin = {
        name: 'test',
        setup() {
          return {}
        },
        install() {},
        attach: undefined as never,
      }
      expect(isModule(plugin)).toBe(false)
    })
  })

  describe('isHTMLElementWithInstance', () => {
    it('returns true for HTMLElement with instance property', () => {
      const el = document.createElement('div')
      ;(el as any).instance = {}
      expect(isHTMLElementWithInstance(el)).toBe(true)
    })

    it('returns false for regular HTMLElement', () => {
      const el = document.createElement('div')
      expect(isHTMLElementWithInstance(el)).toBe(false)
    })

    it('returns false for non-HTMLElement', () => {
      expect(isHTMLElementWithInstance({})).toBe(false)
      expect(isHTMLElementWithInstance(null)).toBe(false)
    })
  })

  describe('hasComponentInstance', () => {
    it('returns true for element with defined instance', () => {
      const el = document.createElement('div')
      ;(el as any).instance = { state: {} }
      expect(hasComponentInstance(el)).toBe(true)
    })

    it('returns false for element with undefined instance', () => {
      const el = document.createElement('div')
      ;(el as any).instance = undefined
      expect(hasComponentInstance(el)).toBe(false)
    })
  })

  describe('isValidLoopMatch', () => {
    it('returns true for valid loop match', () => {
      const match = 'item in items'.match(/^(\w+)\s+in\s+(\w+)$/)
      expect(isValidLoopMatch(match)).toBe(true)
    })

    it('returns false for invalid match', () => {
      expect(isValidLoopMatch(null)).toBe(false)
      expect(isValidLoopMatch([] as any)).toBe(false)
      const invalidMatch = 'invalid'.match(/^(\w+)\s+in\s+(\w+)$/)
      expect(isValidLoopMatch(invalidMatch)).toBe(false)
    })
  })
})
