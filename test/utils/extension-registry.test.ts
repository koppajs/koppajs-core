import { describe, it, expect, beforeEach } from 'vitest'
import { ExtensionRegistry } from '../../src/utils/index'
import type { IPlugin, IModule } from '../../src/types'

describe('ExtensionRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    ExtensionRegistry.modules = {}
    ExtensionRegistry.plugins = {}
  })

  it('has empty modules and plugins initially', () => {
    expect(ExtensionRegistry.modules).toEqual({})
    expect(ExtensionRegistry.plugins).toEqual({})
  })

  it('can store plugins', () => {
    const plugin: IPlugin = {
      name: 'test-plugin',
      setup() {
        return {}
      },
      install() {},
      attach: undefined as never,
    }

    ExtensionRegistry.plugins['test-plugin'] = plugin
    expect(ExtensionRegistry.plugins['test-plugin']).toBe(plugin)
  })

  it('can store modules', () => {
    const module: IModule = {
      name: 'test-module',
      attach() {
        return {}
      },
      install() {},
    }

    ExtensionRegistry.modules['test-module'] = module
    expect(ExtensionRegistry.modules['test-module']).toBe(module)
  })

  it('can store multiple plugins', () => {
    const plugin1: IPlugin = {
      name: 'plugin1',
      setup() {
        return {}
      },
      install() {},
      attach: undefined as never,
    }

    const plugin2: IPlugin = {
      name: 'plugin2',
      setup() {
        return {}
      },
      install() {},
      attach: undefined as never,
    }

    ExtensionRegistry.plugins['plugin1'] = plugin1
    ExtensionRegistry.plugins['plugin2'] = plugin2

    expect(Object.keys(ExtensionRegistry.plugins)).toHaveLength(2)
    expect(ExtensionRegistry.plugins['plugin1']).toBe(plugin1)
    expect(ExtensionRegistry.plugins['plugin2']).toBe(plugin2)
  })

  it('can store multiple modules', () => {
    const module1: IModule = {
      name: 'module1',
      attach() {
        return {}
      },
      install() {},
    }

    const module2: IModule = {
      name: 'module2',
      attach() {
        return {}
      },
      install() {},
    }

    ExtensionRegistry.modules['module1'] = module1
    ExtensionRegistry.modules['module2'] = module2

    expect(Object.keys(ExtensionRegistry.modules)).toHaveLength(2)
    expect(ExtensionRegistry.modules['module1']).toBe(module1)
    expect(ExtensionRegistry.modules['module2']).toBe(module2)
  })

  it('can delete plugins', () => {
    const plugin: IPlugin = {
      name: 'test-plugin',
      setup() {
        return {}
      },
      install() {},
      attach: undefined as never,
    }

    ExtensionRegistry.plugins['test-plugin'] = plugin
    delete ExtensionRegistry.plugins['test-plugin']

    expect(ExtensionRegistry.plugins['test-plugin']).toBeUndefined()
  })

  it('can delete modules', () => {
    const module: IModule = {
      name: 'test-module',
      attach() {
        return {}
      },
      install() {},
    }

    ExtensionRegistry.modules['test-module'] = module
    delete ExtensionRegistry.modules['test-module']

    expect(ExtensionRegistry.modules['test-module']).toBeUndefined()
  })
})
