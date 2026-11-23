import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
  stopGlobalDisconnectionObserver,
} from '../src/global-event-cleaner'
import type { ComponentSource, HTMLElementWithInstance } from '../src/types'
import { logger } from '../src/utils/logger'

let nextId = 0
let frames: FrameRequestCallback[] = []

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function register(source: Partial<ComponentSource> = {}) {
  const name = `precompiled-lifecycle-${++nextId}`
  registerComponent(name, {
    template: '<section><b>{{ label }}</b><slot></slot></section>',
    script: '(() => { throw new Error("Legacy script must not execute") })()',
    compiledScript: () => ({ state: { label: 'Initial' } }),
    style: `${name} { display: block; }`,
    ...source,
  })
  return { name, host: document.createElement(name) as HTMLElementWithInstance }
}

// Advance promise work and render scheduling without wall-clock delays.
async function flushWork() {
  for (let turn = 0; turn < 120; turn++) {
    await Promise.resolve()
    for (const frame of frames.splice(0)) frame(performance.now())
  }
}

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  patchGlobalEventTracking()
  startGlobalDisconnectionObserver()
})

afterEach(async () => {
  document.body.replaceChildren()
  await flushWork()
  stopGlobalDisconnectionObserver()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('precompiled controller lifecycle', () => {
  it('waits for async created before observer rendering, slot commit and readiness', async () => {
    const gate = deferred()
    const created = vi.fn()
    const mounted = vi.fn()
    const factory = vi.fn(() => ({
      state: { label: 'Initial' },
      async created() {
        created()
        await gate.promise
      },
      mounted,
    }))
    const { host } = register({ compiledScript: factory })
    const slot = document.createElement('span')
    slot.textContent = 'Caller content'
    host.append(slot)
    document.body.append(host)
    await flushWork()
    expect(created).toHaveBeenCalledOnce()
    const instance = host.instance!
    expect(instance).toBeDefined()
    let ready = false
    void instance.readyPromise.then(() => {
      ready = true
    })
    instance.state!.label = 'Observer update'
    await flushWork()
    expect(host.querySelector('section')).toBeNull()
    expect(slot.parentNode).toBe(host)
    expect(host.style.opacity).toBe('0')
    expect(mounted).not.toHaveBeenCalled()
    expect(ready).toBe(false)

    gate.resolve()
    await flushWork()
    expect(host.querySelector('b')?.textContent).toBe('Observer update')
    expect(host.querySelector('section > span')).toBe(slot)
    expect(host.style.opacity).toBe('')
    expect(mounted).toHaveBeenCalledOnce()
    expect(factory).toHaveBeenCalledOnce()
    expect(ready).toBe(true)
    await instance.readyPromise
  })

  it.each(['beforeDestroy', 'destroyed'] as const)(
    'preserves the reconnected instance when obsolete %s finishes',
    async (hook) => {
      const gate = deferred()
      const entered = vi.fn()
      const clicked = vi.fn()
      const notified = vi.fn()
      const factory = vi.fn(() => ({
        state: { label: 'Initial' },
        methods: { click: clicked },
        events: [['precompiled-reconnect', 'window', notified]] as [
          string,
          string,
          typeof notified,
        ][],
        async [hook]() {
          entered()
          await gate.promise
        },
      }))
      const { name, host } = register({
        template:
          '<section><b>{{ label }}</b><button onclick="click">Action</button><slot></slot></section>',
        compiledScript: factory,
      })
      const slot = document.createElement('span')
      host.append(slot)
      document.body.append(host)
      await flushWork()
      const instance = host.instance!
      await instance.readyPromise
      host.remove()
      await flushWork()
      expect(entered).toHaveBeenCalledOnce()
      expect(document.getElementById(`style-${name}`)).toBeNull()
      document.body.append(host)
      await flushWork()
      expect(host.instance).toBe(instance)

      gate.resolve()
      await flushWork()
      instance.state!.label = 'Still reactive'
      await flushWork()
      expect(host.instance).toBe(instance)
      expect(factory).toHaveBeenCalledOnce()
      expect(document.getElementById(`style-${name}`)).not.toBeNull()
      expect(host.querySelectorAll('section')).toHaveLength(1)
      expect(host.querySelector('section > span')).toBe(slot)
      expect(host.querySelector('b')?.textContent).toBe('Still reactive')
      host.querySelector('button')!.click()
      window.dispatchEvent(new Event('precompiled-reconnect'))
      expect(clicked).toHaveBeenCalledOnce()
      expect(notified).toHaveBeenCalledOnce()
      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
      expect(document.getElementById(`style-${name}`)).toBeNull()
    },
  )

  it('preserves nested factory hosts, named slots and listeners through projection and updates', async () => {
    const childFactory = vi.fn(() => ({ state: { label: 'Child' } }))
    const parentFactory = vi.fn(() => ({ state: { label: 'Parent' } }))
    const child = register({
      template:
        '<article><b>{{ label }}</b><header><slot name="heading"></slot></header><main><slot></slot></main></article>',
      compiledScript: childFactory,
    }).host
    const { host } = register({ compiledScript: parentFactory })
    const heading = document.createElement('h2')
    heading.slot = 'heading'
    heading.textContent = 'Heading'
    const button = document.createElement('button')
    button.textContent = 'Caller action'
    const clicked = vi.fn()
    button.addEventListener('click', clicked)
    const text = document.createTextNode(' suffix')
    child.append(heading, button, text)
    host.append(child)
    document.body.append(host)
    await flushWork()
    const parentInstance = host.instance!
    const childInstance = child.instance!
    expect(parentInstance).toBeDefined()
    expect(childInstance).toBeDefined()
    await Promise.all([parentInstance.readyPromise, childInstance.readyPromise])
    parentInstance.state!.label = 'Parent updated'
    await flushWork()
    expect(host.querySelector('section > b')?.textContent).toBe('Parent updated')
    childInstance.state!.label = 'Child final'
    await flushWork()

    expect(host.querySelector('section > :last-child')).toBe(child)
    expect(child.instance).toBe(childInstance)
    expect(parentFactory).toHaveBeenCalledOnce()
    expect(childFactory).toHaveBeenCalledOnce()
    expect(host.querySelectorAll('section')).toHaveLength(1)
    expect(child.querySelectorAll('article')).toHaveLength(1)
    expect(child.querySelector('header > h2')).toBe(heading)
    expect(child.querySelector('main > button')).toBe(button)
    expect(child.querySelector('main')?.lastChild).toBe(text)
    expect(child.querySelector('b')?.textContent).toBe('Child final')
    button.click()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('does not commit projection or mount after disconnect during async preparation', async () => {
    const gate = deferred()
    const entered = vi.fn()
    const mounted = vi.fn()
    const { name, host } = register({
      compiledScript: () => ({
        state: { label: 'Initial' },
        async beforeMount() {
          entered()
          await gate.promise
        },
        mounted,
      }),
    })
    const slot = document.createElement('button')
    host.append(slot)
    document.body.append(host)
    await flushWork()
    expect(entered).toHaveBeenCalledOnce()
    expect(slot.parentNode).toBe(host)
    host.remove()
    await flushWork()
    gate.resolve()
    await flushWork()
    expect(host.instance).toBeUndefined()
    expect(host.querySelector('section')).toBeNull()
    expect(slot.parentNode).toBe(host)
    expect(mounted).not.toHaveBeenCalled()
    expect(host.style.opacity).toBe('')
    expect(document.getElementById(`style-${name}`)).toBeNull()
  })

  it('retains original slots and pending readiness after a projection error, then retries', async () => {
    const logged = vi.spyOn(logger, 'errorWithContext')
    const mounted = vi.fn()
    const { host } = register({
      template: '<section><i loop="invalid">{{ item }}</i><slot></slot></section>',
      compiledScript: () => ({ state: { items: ['Recovered'] }, mounted }),
    })
    const slot = document.createElement('button')
    const clicked = vi.fn()
    slot.addEventListener('click', clicked)
    host.append(slot)
    document.body.append(host)
    await flushWork()
    expect(logged).toHaveBeenCalledWith(
      'Error during render',
      expect.any(Object),
      expect.objectContaining({
        message: 'Invalid loop binding: expected <id> or [<id>, <id>]',
      }),
    )
    const instance = host.instance!
    let ready = false
    void instance.readyPromise.then(() => {
      ready = true
    })
    await flushWork()
    expect(ready).toBe(false)
    expect(mounted).not.toHaveBeenCalled()
    expect(slot.parentNode).toBe(host)
    expect(host.querySelector('section')).toBeNull()
    expect(host.style.opacity).toBe('')

    instance.template.content.querySelector('i')!.setAttribute('loop', 'item in items')
    instance.state!.items = ['Retried']
    await flushWork()
    expect(host.querySelector('i')?.textContent).toBe('Retried')
    expect(host.querySelector('section > button')).toBe(slot)
    expect(mounted).toHaveBeenCalledOnce()
    expect(ready).toBe(true)
    slot.click()
    expect(clicked).toHaveBeenCalledOnce()
    await instance.readyPromise
  })

  it('removes listeners and model observation on final teardown and rebinds once on reinitialization', async () => {
    const clicked = vi.fn()
    const notified = vi.fn()
    const updated = vi.fn()
    const destroyed = vi.fn()
    const factory = vi.fn(() => ({
      state: { label: 'Initial' },
      methods: { click: clicked },
      events: [['precompiled-final', 'window', notified]] as [
        string,
        string,
        typeof notified,
      ][],
      updated,
      destroyed,
    }))
    const { name, host } = register({
      template:
        '<section><b>{{ label }}</b><button onclick="click">Action</button><slot></slot></section>',
      compiledScript: factory,
    })
    const slot = document.createElement('span')
    host.append(slot)
    document.body.append(host)
    await flushWork()
    const instance = host.instance!
    expect(instance).toBeDefined()
    await instance.readyPromise
    const oldButton = host.querySelector('button')!
    oldButton.click()
    window.dispatchEvent(new Event('precompiled-final'))
    expect(clicked).toHaveBeenCalledOnce()
    expect(notified).toHaveBeenCalledOnce()
    instance.state!.label = 'Connected update'
    await flushWork()
    expect(updated).toHaveBeenCalledOnce()

    host.remove()
    await flushWork()
    expect(host.instance).toBeUndefined()
    expect(destroyed).toHaveBeenCalledOnce()
    expect(document.getElementById(`style-${name}`)).toBeNull()
    oldButton.click()
    window.dispatchEvent(new Event('precompiled-final'))
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')
    instance.state!.label = 'Obsolete update'
    await flushWork()
    expect(raf).not.toHaveBeenCalled()
    expect(updated).toHaveBeenCalledOnce()
    expect(clicked).toHaveBeenCalledOnce()
    expect(notified).toHaveBeenCalledOnce()

    document.body.append(host)
    await flushWork()
    expect(host.instance).toBeDefined()
    expect(host.instance).not.toBe(instance)
    expect(factory).toHaveBeenCalledTimes(2)
    expect(host.querySelectorAll('section')).toHaveLength(1)
    expect(host.querySelector('section > span')).toBe(slot)
    host.querySelector('button')!.click()
    window.dispatchEvent(new Event('precompiled-final'))
    expect(clicked).toHaveBeenCalledTimes(2)
    expect(notified).toHaveBeenCalledTimes(2)
    host.remove()
    await flushWork()
    window.dispatchEvent(new Event('precompiled-final'))
    expect(notified).toHaveBeenCalledTimes(2)
    expect(host.instance).toBeUndefined()
    expect(destroyed).toHaveBeenCalledTimes(2)
  })
})
