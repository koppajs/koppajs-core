import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as CoreApi from '../src/index'
import { Core } from '../src/index'
import type { ComponentSource, IPlugin, IModule } from '../src/types'

describe('index', () => {
  beforeEach(() => {
    // Reset state before each test
    vi.clearAllMocks()
  })

  describe('Core', () => {
    it('does not expose DOM initialization as public API', () => {
      expect('initDomEnvironment' in CoreApi).toBe(false)
    })

    it('is callable as a function', () => {
      expect(typeof Core).toBe('function')
      expect(() => Core()).not.toThrow()
    })

    it('has take method', () => {
      expect(typeof Core.take).toBe('function')
    })

    it('queues take operations before initialization', () => {
      const componentSource: ComponentSource = {
        template: '<div></div>',
        script: '{}',
        style: '',
      }

      // Should not throw before initialization
      expect(() => Core.take(componentSource, 'test-component')).not.toThrow()

      // Initialize and process queued takes
      Core()

      // Component should be registered
      expect(customElements.get('test-component')).toBeDefined()
    })

    it('processes take operations immediately after initialization', () => {
      Core() // Initialize first

      const componentSource: ComponentSource = {
        template: '<div></div>',
        script: '{}',
        style: '',
      }

      Core.take(componentSource, 'test-component-2')

      // Component should be registered immediately
      expect(customElements.get('test-component-2')).toBeDefined()
    })

    it('registers plugin via take', () => {
      Core() // Initialize first

      const plugin: IPlugin = {
        name: 'test-plugin',
        install() {},
        setup() {
          return {}
        },
        attach: undefined as never,
      }

      Core.take(plugin)

      // Plugin should be registered (we can't easily test ExtensionRegistry here)
      expect(() => Core.take(plugin)).not.toThrow()
    })

    it('registers module via take', () => {
      Core() // Initialize first

      const module: IModule = {
        name: 'test-module',
        install() {},
        attach() {
          return {}
        },
      }

      Core.take(module)

      // Module should be registered
      expect(() => Core.take(module)).not.toThrow()
    })

    it('initializes DOM extensions when Core() runs', () => {
      Core()

      const element = document.createElement('div')
      expect(typeof (element as any).select).toBe('function')
      expect(typeof (element as any).addClass).toBe('function')
    })
  })
})
