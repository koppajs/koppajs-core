import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import { patchGlobalEventTracking } from '../src/global-event-cleaner'
import type { ComponentSource, HTMLElementWithInstance } from '../src/types'

let nextId = 0
let frames: FrameRequestCallback[] = []

function register(source: Partial<ComponentSource> = {}) {
  const name = `reconnect-slots-${++nextId}`
  registerComponent(name, {
    template: '<section class="badge"><slot></slot></section>',
    script: '{ state: {} }',
    style: `${name} { display: block; }`,
    ...source,
  })
  return { name, host: document.createElement(name) as HTMLElementWithInstance }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// Runtime work here consists only of promises and explicitly queued animation frames.
async function flushWork() {
  for (let turn = 0; turn < 80; turn++) {
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
})

afterEach(async () => {
  document.body.replaceChildren()
  await flushWork()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('component reconnect slot ownership', () => {
  it('keeps original slot nodes without nesting wrappers on a normal state update', async () => {
    const mounted = vi.fn()
    const updated = vi.fn()
    const { host } = register({
      template: '<section class="signal"><b>{{ label }}</b><slot></slot></section>',
      deps: { hooks: async () => ({ mounted, updated }) },
      script: `{
        state: { label: 'Initial' },
        mounted() { hooks.mounted() },
        updated() { hooks.updated() }
      }`,
    })
    const button = document.createElement('button')
    button.textContent = 'Original action'
    const text = document.createTextNode(' original text')
    const clicked = vi.fn()
    button.addEventListener('click', clicked)
    host.append(button, text)
    document.body.append(host)
    await flushWork()
    expect(mounted).toHaveBeenCalledOnce()
    expect(host.querySelectorAll('.signal')).toHaveLength(1)
    expect(host.querySelector(':scope > .signal > button')).toBe(button)
    expect(host.querySelector('.signal')?.lastChild).toBe(text)
    const instance = host.instance!

    instance.state!.label = 'Updated'
    await flushWork()

    expect.soft(host.instance).toBe(instance)
    expect.soft(updated).toHaveBeenCalledOnce()
    expect.soft(mounted).toHaveBeenCalledOnce()
    expect.soft(host.querySelectorAll('.signal')).toHaveLength(1)
    expect.soft(host.querySelectorAll('b')).toHaveLength(1)
    expect.soft(host.querySelector(':scope > .signal > b')?.textContent).toBe('Updated')
    expect.soft(host.querySelector(':scope > .signal > button')).toBe(button)
    expect.soft(host.querySelector('.signal')?.lastChild).toBe(text)
    expect.soft(host.style.opacity).toBe('')
    button.click()
    expect.soft(clicked).toHaveBeenCalledOnce()
  })

  it('waits for created hooks when observer work is scheduled while connected', async () => {
    const createdGate = deferred()
    const created = vi.fn()
    const mounted = vi.fn()
    const { host } = register({
      template: '<section class="badge"><b>{{ label }}</b><slot></slot></section>',
      deps: {
        hooks: async () => ({ created, mounted }),
        gate: async () => ({ promise: createdGate.promise }),
      },
      script: `{
        state: { label: 'Initial' },
        async created() { this.label = 'From created'; hooks.created(); await gate.promise },
        mounted() { hooks.mounted() }
      }`,
    })
    const label = document.createElement('span')
    host.append(label)
    document.body.append(host)
    await flushWork()
    expect(created).toHaveBeenCalledOnce()
    const instance = host.instance!
    let ready = false
    void instance.readyPromise!.then(() => {
      ready = true
    })
    instance.state!.label = 'Observer update'
    await flushWork()
    expect(host.querySelector('.badge')).toBeNull()
    expect(label.parentNode).toBe(host)
    expect(mounted).not.toHaveBeenCalled()
    expect(ready).toBe(false)

    createdGate.resolve()
    await flushWork()
    expect(host.querySelector('b')?.textContent).toBe('Observer update')
    expect(host.querySelector('.badge > span')).toBe(label)
    expect(mounted).toHaveBeenCalledOnce()
    expect(ready).toBe(true)
    expect(host.style.opacity).toBe('')
  })

  it('preserves named and default slot identity across updates and reinitialization', async () => {
    const { host } = register({
      template:
        '<section class="badge"><b>{{ label }}</b><header><slot name="heading"></slot></header><main><slot></slot></main></section>',
      script: '{ state: { label: "Initial" } }',
    })
    const heading = document.createElement('h2')
    heading.setAttribute('slot', 'heading')
    heading.textContent = 'Caller heading'
    const body = document.createElement('p')
    body.textContent = 'Caller body'
    const text = document.createTextNode(' suffix')
    host.append(heading, body, text)

    for (let connection = 0; connection < 2; connection++) {
      document.body.append(host)
      await flushWork()
      host.instance!.state!.label = `Updated ${connection}`
      await flushWork()
      expect(host.querySelectorAll('.badge')).toHaveLength(1)
      expect(host.querySelector('b')?.textContent).toBe(`Updated ${connection}`)
      expect(host.querySelector('header > h2')).toBe(heading)
      expect(host.querySelector('main > p')).toBe(body)
      expect(host.querySelector('main')?.lastChild).toBe(text)
      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
    }
  })

  it('resumes an aborted initial render after reconnect during async teardown', async () => {
    const mountGate = deferred()
    const destroyGate = deferred()
    const beforeMount = vi.fn()
    const beforeDestroy = vi.fn()
    const created = vi.fn()
    const mounted = vi.fn()
    const destroyed = vi.fn()
    const { host } = register({
      deps: {
        hooks: async () => ({ beforeMount, beforeDestroy, created, mounted, destroyed }),
        gates: async () => ({ mount: mountGate.promise, destroy: destroyGate.promise }),
      },
      script: `{
        state: {},
        created() { hooks.created() },
        async beforeMount() { hooks.beforeMount(); await gates.mount },
        mounted() { hooks.mounted() },
        async beforeDestroy() { hooks.beforeDestroy(); await gates.destroy },
        destroyed() { hooks.destroyed() }
      }`,
    })
    const label = document.createElement('span')
    label.textContent = 'Original chip'
    host.append(label)
    document.body.append(host)
    await flushWork()
    expect(beforeMount).toHaveBeenCalledOnce()
    const instance = host.instance!
    let ready = false
    void instance.readyPromise!.then(() => {
      ready = true
    })

    host.remove()
    await flushWork()
    expect(beforeDestroy).toHaveBeenCalledOnce()
    mountGate.resolve()
    await flushWork()
    expect(host.querySelector('.badge')).toBeNull()
    expect(ready).toBe(false)
    document.body.append(host)
    destroyGate.resolve()
    await flushWork()

    expect.soft(host.instance).toBe(instance)
    expect.soft(host.querySelector(':scope > .badge > span')).toBe(label)
    expect.soft(host.style.opacity).toBe('')
    expect.soft(host.style.getPropertyValue('transition-property')).toBe('')
    expect.soft(ready).toBe(true)
    expect.soft(created).toHaveBeenCalledOnce()
    expect.soft(mounted).toHaveBeenCalledOnce()
    expect.soft(destroyed).not.toHaveBeenCalled()
  })

  it('resumes when created finishes while disconnected before teardown completes', async () => {
    const createdGate = deferred()
    const destroyGate = deferred()
    const created = vi.fn()
    const mounted = vi.fn()
    const { host } = register({
      deps: {
        hooks: async () => ({ created, mounted }),
        gates: async () => ({
          created: createdGate.promise,
          destroy: destroyGate.promise,
        }),
      },
      script: `{
        state: {},
        async created() { hooks.created(); await gates.created },
        async beforeDestroy() { await gates.destroy },
        mounted() { hooks.mounted() }
      }`,
    })
    const label = document.createElement('span')
    label.textContent = 'Created before disconnect'
    host.append(label)
    document.body.append(host)
    await flushWork()
    const instance = host.instance!
    expect(created).toHaveBeenCalledOnce()
    let ready = false
    void instance.readyPromise!.then(() => {
      ready = true
    })
    host.remove()
    await flushWork()
    createdGate.resolve()
    await flushWork()
    expect(host.querySelector('.badge')).toBeNull()
    expect(ready).toBe(false)
    document.body.append(host)
    destroyGate.resolve()
    await flushWork()
    expect(host.instance).toBe(instance)
    expect(host.querySelector(':scope > .badge > span')).toBe(label)
    expect(host.style.opacity).toBe('')
    expect(ready).toBe(true)
    expect(mounted).toHaveBeenCalledOnce()
  })

  it('does not reuse rendered wrappers as slot input after completed teardown', async () => {
    const { host } = register()
    const label = document.createElement('span')
    label.textContent = 'Original badge'
    const text = document.createTextNode(' suffix')
    host.append(label, text)
    document.body.append(host)
    await flushWork()
    expect(host.querySelector(':scope > .badge > span')).toBe(label)
    const initial = host.instance

    for (let reconnect = 0; reconnect < 2; reconnect++) {
      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
      document.body.append(host)
      await flushWork()
      expect(host.instance).toBeDefined()
      expect(host.instance).not.toBe(initial)
      expect.soft(host.querySelectorAll('.badge')).toHaveLength(1)
      expect.soft(host.querySelector(':scope > .badge > span')).toBe(label)
      expect.soft(host.querySelector('.badge')?.lastChild).toBe(text)
      expect.soft(host.textContent).toBe('Original badge suffix')
      expect.soft(host.style.opacity).toBe('')
    }
  })

  it('rebinds events once on reconnect and removes them on completed teardown', async () => {
    const clicked = vi.fn()
    const notified = vi.fn()
    const { host } = register({
      template:
        '<section class="badge"><button onclick="click">Activate</button><slot></slot></section>',
      deps: { clicked: async () => clicked, notified: async () => notified },
      script: `{
        state: {}, methods: { click() { clicked() } },
        events: [['reconnect-slot-notify', 'window', () => notified()]]
      }`,
    })
    const label = document.createElement('span')
    label.textContent = 'Event badge'
    host.append(label)
    document.body.append(host)
    await flushWork()
    host.querySelector('button')!.click()
    window.dispatchEvent(new Event('reconnect-slot-notify'))
    expect(clicked).toHaveBeenCalledOnce()
    expect(notified).toHaveBeenCalledOnce()
    const oldButton = host.querySelector('button')!

    host.remove()
    await flushWork()
    expect(host.instance).toBeUndefined()
    oldButton.click()
    window.dispatchEvent(new Event('reconnect-slot-notify'))
    expect(clicked).toHaveBeenCalledOnce()
    expect(notified).toHaveBeenCalledOnce()

    document.body.append(host)
    await flushWork()
    expect.soft(host.querySelectorAll('button')).toHaveLength(1)
    host.querySelector('button')!.click()
    window.dispatchEvent(new Event('reconnect-slot-notify'))
    expect.soft(clicked).toHaveBeenCalledTimes(2)
    expect.soft(notified).toHaveBeenCalledTimes(2)
    expect.soft(host.querySelector(':scope > .badge > span')).toBe(label)
  })

  it('preserves caller opacity priorities and releases temporary styles on teardown', async () => {
    const { name, host } = register()
    host.style.cssText =
      'opacity: 0.4 !important; transition-property: opacity !important'
    host.append(document.createTextNode('Styled badge'))
    for (let reconnect = 0; reconnect < 2; reconnect++) {
      document.body.append(host)
      expect(host.style.opacity).toBe('0')
      await flushWork()
      expect(host.style.opacity).toBe('0.4')
      expect(host.style.getPropertyPriority('opacity')).toBe('important')
      expect(host.style.getPropertyValue('transition-property')).toBe('opacity')
      expect(host.style.getPropertyPriority('transition-property')).toBe('important')
      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
      expect(document.getElementById(`style-${name}`)).toBeNull()
      expect(host.style.opacity).toBe('0.4')
      expect(host.style.getPropertyValue('transition-property')).toBe('opacity')
    }
  })
})
