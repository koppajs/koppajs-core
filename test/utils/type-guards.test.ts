import { describe, it, expect } from 'vitest'
import {
  isComponentSource,
  isPlugin,
  isModule,
  isHTMLElementWithInstance,
  hasComponentInstance,
  isValidLoopMatch,
} from '../../src/utils/index'
import type { ComponentSource, IPlugin, IModule } from '../../src/types'

describe('type-guards', () => {
  /* ------------------------------------------------------------------------ */
  /*  ComponentSource Contract Tests                                          */
  /* ------------------------------------------------------------------------ */

  describe('isComponentSource', () => {
    describe('REQUIRED fields validation', () => {
      it('accepts minimal valid ComponentSource with all required fields', () => {
        const source: ComponentSource = {
          template: '<div></div>',
          script: 'return {}',
          style: 'div { color: red; }',
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts empty strings for required fields', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('rejects when template is missing', () => {
        expect(isComponentSource({ script: '', style: '' })).toBe(false)
      })

      it('rejects when script is missing', () => {
        expect(isComponentSource({ template: '', style: '' })).toBe(false)
      })

      it('rejects when style is missing', () => {
        expect(isComponentSource({ template: '', script: '' })).toBe(false)
      })

      it('rejects when required field has wrong type', () => {
        expect(isComponentSource({ template: 123, script: '', style: '' })).toBe(false)
        expect(isComponentSource({ template: '', script: null, style: '' })).toBe(false)
        expect(isComponentSource({ template: '', script: '', style: [] })).toBe(false)
      })
    })

    describe('OPTIONAL fields handling', () => {
      it('accepts presence of optional deps field', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
          deps: null,
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts presence of optional deps with async functions', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
          deps: {
            MyComponent: () => Promise.resolve({}),
          },
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts presence of optional type field', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
          type: 'composite',
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts presence of optional scriptMap field', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
          scriptMap: { version: 3, sources: [] },
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts presence of optional structAttr field', () => {
        const source: ComponentSource = {
          template: '',
          script: '',
          style: '',
          structAttr: 'data-custom-key',
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts all optional fields together', () => {
        const source: ComponentSource = {
          template: '<div></div>',
          script: 'return { state: {} }',
          style: '.foo {}',
          scriptMap: null,
          type: 'options',
          deps: { util: () => Promise.resolve({}) },
          structAttr: 'data-k-id',
        }
        expect(isComponentSource(source)).toBe(true)
      })
    })

    describe('IGNORED fields - extra fields allowed', () => {
      it('accepts presence of unknown extra fields', () => {
        const source = {
          template: '',
          script: '',
          style: '',
          customDebugField: true,
          buildTimestamp: Date.now(),
          unknownMetadata: { nested: 'value' },
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts previously used fields that are now ignored', () => {
        const source = {
          template: '',
          script: '',
          style: '',
          path: '/src/components/MyComponent.kpa', // removed from contract
          contractVersion: '1.0.0', // removed from contract
        }
        expect(isComponentSource(source)).toBe(true)
      })

      it('accepts plugin-specific extension fields', () => {
        const source = {
          template: '',
          script: '',
          style: '',
          __vite_plugin_debug__: { transformMs: 42 },
          hmrBoundary: true,
        }
        expect(isComponentSource(source)).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('returns false for null', () => {
        expect(isComponentSource(null)).toBe(false)
      })

      it('returns false for undefined', () => {
        expect(isComponentSource(undefined)).toBe(false)
      })

      it('returns false for empty object', () => {
        expect(isComponentSource({})).toBe(false)
      })

      it('returns false for primitives', () => {
        expect(isComponentSource('string')).toBe(false)
        expect(isComponentSource(123)).toBe(false)
        expect(isComponentSource(true)).toBe(false)
      })

      it('returns false for arrays', () => {
        expect(isComponentSource([])).toBe(false)
        expect(isComponentSource(['template', 'script', 'style'])).toBe(false)
      })
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
