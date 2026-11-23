import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import type { ComponentSource, HTMLElementWithInstance } from '../src/types'
import * as script from '../src/utils/script'
import { logger } from '../src/utils/logger'
import { ExtensionRegistry } from '../src/utils/extension-registry'
import type { ComponentContext, CompiledScript } from '../src/types'

function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise<unknown>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

let nextId = 0
function register(source: Partial<ComponentSource>) {
  const name = `precompiled-${++nextId}`
  registerComponent(name, {
    template: '<button type="button">Ready</button>',
    script: '(() => { throw new Error("Legacy script must not execute") })()',
    style: '',
    ...source,
  })
  return document.createElement(name) as HTMLElementWithInstance
}

async function flushWork() {
  for (let turn = 0; turn < 80; turn++) await Promise.resolve()
}

afterEach(async () => {
  document.body.replaceChildren()
  await flushWork()
  vi.restoreAllMocks()
})

describe('precompiled controllers', () => {
  it('prioritizes the factory without compiling or executing the legacy script', async () => {
    const compile = vi.spyOn(script, 'compileCode')
    const error = vi.spyOn(logger, 'errorWithContext')
    const factory = vi.fn(() => ({ state: { value: 42 } }))
    const host = register({ compiledScript: factory })
    document.body.append(host)
    await flushWork()

    expect(factory).toHaveBeenCalledOnce()
    expect(host.instance?.state?.value).toBe(42)
    expect(host.querySelector('button')?.textContent).toBe('Ready')
    expect(compile).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    await host.instance!.readyPromise
  })

  it('passes resolved imports once under their original keys and keeps the live context', async () => {
    const value = { answer: 42 }
    const load = vi.fn(async () => value)
    const attached = { active: true }
    const attach = vi.fn(() => attached)
    ExtensionRegistry.modules.precompiledTest = {
      name: 'precompiledTest',
      install() {},
      attach,
    }
    let context!: ComponentContext
    let dependencies: Record<string, unknown> | undefined
    try {
      const selected = vi.fn()
      const parent = register({
        script: '',
        compiledScript: () => ({ methods: { onSelected: selected } }),
      })
      const host = register({
        template: '<button ref="action">Ready</button>',
        deps: { 'original-key': load },
        compiledScript(ctx, deps) {
          context = ctx
          dependencies = deps
          expect(ctx.$precompiledTest).toBe(attached)
          expect(ctx.$refs).toEqual({})
          return { state: { value: deps?.['original-key'] } }
        },
      })
      document.body.append(parent)
      await flushWork()
      parent.append(host)
      await flushWork()
      expect(load).toHaveBeenCalledOnce()
      expect(dependencies).toEqual({ 'original-key': value })
      expect(dependencies!['original-key']).toBe(value)
      expect(context.$parent).toBe(parent.instance)
      expect(context.$refs).toBe(host.instance!.$refs)
      expect(context.$refs.action).toBe(host.querySelector('button'))
      expect(context.$emit).toBe(host.instance!.$emit)
      expect(context.$take).toBe(host.instance!.$take)
      context.$emit('selected', value)
      expect(selected).toHaveBeenCalledWith(value)
      expect(attach).toHaveBeenCalledTimes(2)
    } finally {
      delete ExtensionRegistry.modules.precompiledTest
    }
  })

  it('passes undefined without deps so factory defaults work', async () => {
    const factory = vi.fn((_context: ComponentContext, deps = {}) => ({
      state: { deps },
    }))
    const host = register({ script: '', compiledScript: factory })
    document.body.append(host)
    await flushWork()
    expect(factory.mock.calls[0][1]).toBeUndefined()
    expect(host.instance?.state?.deps).toEqual({})
  })

  it.each([null, {}])('defines dependency-map behavior for %j', async (deps) => {
    const factory = vi.fn(() => ({}))
    const host = register({ deps, compiledScript: factory })
    document.body.append(host)
    await flushWork()
    expect(factory.mock.calls[0]).toEqual([
      expect.any(Object),
      deps === null ? undefined : {},
    ])
  })

  it('processes factory props through the existing model and default rules', async () => {
    const host = register({
      compiledScript: () => ({
        props: { label: { type: 'string' }, count: { type: 'number', default: 42 } },
        state: {},
      }),
    })
    host.setAttribute('label', 'From attribute')
    document.body.append(host)
    await flushWork()
    expect(host.instance?.state).toMatchObject({ label: 'From attribute', count: 42 })
  })

  it('uses the legacy compiler when compiledScript is explicitly undefined', async () => {
    const compile = vi.spyOn(script, 'compileCode')
    const host = register({
      script: '({ state: { legacy: true } })',
      compiledScript: undefined,
    })
    document.body.append(host)
    await flushWork()
    expect(compile).toHaveBeenCalledOnce()
    expect(host.instance?.state?.legacy).toBe(true)
  })

  it('never invokes a cancelled connection factory after imports settle', async () => {
    const old = deferred()
    const current = deferred()
    const load = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
    const factory = vi.fn((_ctx: ComponentContext, deps?: Record<string, unknown>) => ({
      state: { value: deps?.value },
    }))
    const host = register({ deps: { value: load }, compiledScript: factory })
    document.body.append(host)
    host.remove()
    old.resolve('obsolete')
    await flushWork()
    expect(factory).not.toHaveBeenCalled()
    document.body.append(host)
    current.resolve('current')
    await flushWork()
    expect(factory).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledTimes(2)
    expect(host.instance?.state?.value).toBe('current')
  })

  it('preserves import errors without invoking either controller path', async () => {
    const failure = new Error('import failed')
    const logged = vi.spyOn(logger, 'errorWithContext')
    const compile = vi.spyOn(script, 'compileCode')
    const factory = vi.fn(() => ({}))
    const host = register({
      compiledScript: factory,
      deps: {
        value: async () => {
          throw failure
        },
      },
    })
    document.body.append(host)
    await flushWork()
    expect(logged).toHaveBeenCalledWith(
      'Error during initialization',
      expect.any(Object),
      failure,
    )
    expect(factory).not.toHaveBeenCalled()
    expect(compile).not.toHaveBeenCalled()
    expect(host.instance).toBeUndefined()
    expect(host.style.opacity).toBe('')
  })

  it.each([null, false, 42, 'factory', {}])(
    'rejects explicitly invalid compiledScript %j without fallback',
    async (invalid) => {
      const logged = vi.spyOn(logger, 'errorWithContext')
      const compile = vi.spyOn(script, 'compileCode')
      const host = register({ compiledScript: invalid as unknown as CompiledScript })
      document.body.append(host)
      await flushWork()
      expect(logged).toHaveBeenCalledWith(
        'Error during initialization',
        expect.any(Object),
        expect.objectContaining({
          name: 'TypeError',
          message: 'compiledScript must be a function',
        }),
      )
      expect(compile).not.toHaveBeenCalled()
      expect(host.instance).toBeUndefined()
    },
  )

  it.each([null, undefined, 42, 'controller', [], Promise.resolve({}), { then() {} }])(
    'rejects invalid synchronous controller %j before model allocation',
    async (invalid) => {
      const logged = vi.spyOn(logger, 'errorWithContext')
      const compile = vi.spyOn(script, 'compileCode')
      const factory = vi.fn(() => invalid) as unknown as CompiledScript
      const host = register({ compiledScript: factory })
      document.body.append(host)
      await flushWork()
      expect(logged).toHaveBeenCalledWith(
        'Error during initialization',
        expect.any(Object),
        expect.objectContaining({
          name: 'TypeError',
          message: 'compiledScript must return a synchronous ComponentController object',
        }),
      )
      expect(compile).not.toHaveBeenCalled()
      expect(host.instance).toBeUndefined()
      expect(host).toMatchObject({
        _model: undefined,
        _observerFn: undefined,
        _eventCleanup: null,
        _resumeRender: undefined,
      })
      expect(host.style.opacity).toBe('')
      host.remove()
      await flushWork()
      expect(document.getElementById(`style-${host.localName}`)).toBeNull()
    },
  )

  it('logs thrown factory errors without fallback and can retry a fresh connection', async () => {
    const failure = new Error('factory failed')
    const logged = vi.spyOn(logger, 'errorWithContext')
    const compile = vi.spyOn(script, 'compileCode')
    const factory = vi
      .fn()
      .mockImplementationOnce(() => {
        throw failure
      })
      .mockReturnValue({ state: { recovered: true } })
    const host = register({ compiledScript: factory })
    document.body.append(host)
    await flushWork()
    expect(logged).toHaveBeenCalledWith(
      'Error during initialization',
      expect.any(Object),
      failure,
    )
    expect(host.instance).toBeUndefined()
    expect(host).toMatchObject({
      _model: undefined,
      _observerFn: undefined,
      _eventCleanup: null,
    })
    host.remove()
    await flushWork()
    document.body.append(host)
    await flushWork()
    expect(host.instance?.state?.recovered).toBe(true)
    expect(factory).toHaveBeenCalledTimes(2)
    expect(compile).not.toHaveBeenCalled()
  })

  it.each(['options', 'composite'] as const)(
    'preserves %s binding and legacy dependency injection',
    async (type) => {
      const legacy = register({
        type,
        script:
          '{ state: { value: initial }, methods: { read() { return this.value } }, created() { hooks() } }',
        deps: { initial: async () => 42, hooks: async () => vi.fn() },
      })
      const createdContexts: unknown[] = []
      const factory = register({
        type,
        compiledScript: () => ({
          state: { value: 42 },
          methods: {
            read() {
              return this.value
            },
          },
          created() {
            createdContexts.push(this)
          },
        }),
      })
      document.body.append(legacy, factory)
      await flushWork()
      expect(legacy.instance?.state?.value).toBe(42)
      expect(factory.instance?.state?.value).toBe(42)
      if (type === 'options') {
        expect(factory.instance!.methods!.read()).toBe(42)
        expect(legacy.instance!.methods!.read()).toBe(42)
        expect(createdContexts[0]).toBe(factory.instance!.userContext)
      } else {
        expect(factory.instance!.userContext).toBeUndefined()
        expect(legacy.instance!.userContext).toBeUndefined()
        expect(createdContexts[0]).toBeUndefined()
      }
    },
  )
})
