import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import type { ComponentSource, HTMLElementWithInstance } from '../src/types'
import {
  patchGlobalEventTracking,
  startGlobalDisconnectionObserver,
  stopGlobalDisconnectionObserver,
} from '../src/global-event-cleaner'
import { logger } from '../src/utils/logger'

let nextId = 0
function register(source: Partial<ComponentSource> = {}) {
  const name = `first-render-${++nextId}`
  registerComponent(name, {
    template: '<section><slot></slot></section>',
    script: '{ state: {} }',
    style: `${name} { display: block; }`,
    ...source,
  })
  return { name, host: document.createElement(name) as HTMLElementWithInstance }
}

function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise<unknown>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function ready(host: HTMLElementWithInstance) {
  await vi.waitFor(() => expect(host.instance).toBeDefined())
  await host.instance!.readyPromise
}

afterEach(() => {
  stopGlobalDisconnectionObserver()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('component first-render visibility', () => {
  it('inserts CSS on connect before dependencies resolve, not on registration', async () => {
    const dep = deferred()
    const { name, host } = register({ deps: { dep: () => dep.promise } })
    expect(document.getElementById(`style-${name}`)).toBeNull()
    host.innerHTML = '<h1>Visible slot</h1>'
    document.body.appendChild(host)
    expect(document.getElementById(`style-${name}`)).not.toBeNull()
    expect(host.querySelector('h1')?.isConnected).toBe(true)
    expect(getComputedStyle(host).opacity).toBe('0')
    expect(host.instance).toBeUndefined()
    dep.resolve({})
    await ready(host)
    host.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
  })

  it('protects slot children arriving after connection while dependencies are pending', async () => {
    const dep = deferred()
    const { host } = register({ deps: { dep: () => dep.promise } })
    document.body.appendChild(host)
    const heading = document.createElement('h1')
    heading.textContent = 'Parser or caller supplied slot'
    host.appendChild(heading)
    expect(getComputedStyle(host).opacity).toBe('0')
    expect(heading.isConnected).toBe(true)
    dep.resolve({})
    await ready(host)
    expect(host.querySelector('section > h1')).toBe(heading)
    expect(host.style.opacity).toBe('')
  })

  it('preserves author presentation and form state without touching child display', async () => {
    const dep = deferred()
    const { host } = register({ deps: { dep: () => dep.promise } })
    host.style.cssText =
      'opacity: 0.4 !important; transition: opacity 2s; display: block; color: red'
    const field = document.createElement('input')
    field.value = 'edited value'
    field.setSelectionRange(2, 5)
    const hidden = document.createElement('span')
    hidden.style.display = 'none'
    hidden.textContent = 'Intentionally hidden'
    host.append(field, hidden)
    document.body.appendChild(host)
    expect(getComputedStyle(host).opacity).toBe('0')
    expect(host.style.display).toBe('block')
    expect(field.isConnected).toBe(true)
    expect(hidden.style.display).toBe('none')
    dep.resolve({})
    await ready(host)
    expect(host.querySelector('input')).toBe(field)
    expect(field.value).toBe('edited value')
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 5])
    expect(host.style.opacity).toBe('0.4')
    expect(host.style.getPropertyPriority('opacity')).toBe('important')
    expect(host.style.transition).toBe('opacity 2s')
    expect(host.style.getPropertyValue('transition-property')).toBe('')
    expect(hidden.style.display).toBe('none')
  })

  it('preserves listeners through slot commit with global cleanup enabled', async () => {
    patchGlobalEventTracking()
    startGlobalDisconnectionObserver()
    const { host } = register()
    const button = document.createElement('button')
    const clicked = vi.fn()
    button.addEventListener('click', clicked)
    host.appendChild(button)
    document.body.appendChild(host)
    await ready(host)
    await Promise.resolve()
    button.click()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('does not disconnect slotted custom elements during asynchronous preparation', async () => {
    const gate = deferred()
    const entered = vi.fn()
    const connected = vi.fn()
    const disconnected = vi.fn()
    const tag = `slot-lifecycle-${++nextId}`
    customElements.define(
      tag,
      class extends HTMLElement {
        connectedCallback() {
          connected()
        }
        disconnectedCallback() {
          disconnected()
        }
      },
    )
    const { host } = register({
      deps: {
        gate: async () => ({ promise: gate.promise }),
        entered: async () => entered,
      },
      script: '{ state: {}, async beforeMount() { entered(); await gate.promise } }',
    })
    const child = document.createElement(tag)
    child.textContent = 'Nested content'
    host.appendChild(child)
    document.body.appendChild(host)
    await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce())
    expect(connected).toHaveBeenCalledOnce()
    expect(disconnected).not.toHaveBeenCalled()
    expect(child.parentNode).toBe(host)
    expect(getComputedStyle(host).opacity).toBe('0')
    gate.resolve({})
    await ready(host)
    expect(host.querySelector(tag)).toBe(child)
    // Only the existing synchronous transfer at commit reconnects the original.
    expect(connected).toHaveBeenCalledTimes(2)
    expect(disconnected).toHaveBeenCalledOnce()
  })

  it('keeps an aborted first render protected until the latest render commits', async () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    const gate = deferred()
    const entered = vi.fn()
    const mounted = vi.fn()
    const { host } = register({
      deps: {
        gate: async () => ({ promise: gate.promise }),
        entered: async () => entered,
        mounted: async () => mounted,
      },
      script: `{ state: { value: 'old' }, async beforeMount() {
        entered(); await gate.promise
      }, mounted() { mounted() } }`,
      template: '<main><b>{{ value }}</b><slot></slot></main>',
    })
    host.innerHTML = '<h1>Raw heading</h1>'
    document.body.appendChild(host)
    await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce())
    let resolved = false
    void host.instance!.readyPromise!.then(() => {
      resolved = true
    })
    host.instance!.state!.value = 'new'
    await Promise.resolve()
    for (const cb of frames.splice(0)) cb(performance.now())
    gate.resolve({})
    await vi.waitFor(() => expect(frames.length).toBeGreaterThan(0))
    expect(host.querySelector('main')).toBeNull()
    expect(getComputedStyle(host).opacity).toBe('0')
    expect(mounted).not.toHaveBeenCalled()
    expect(resolved).toBe(false)
    for (const cb of frames.splice(0)) cb(performance.now())
    await ready(host)
    expect(host.querySelector('b')?.textContent).toBe('new')
    expect(host.style.opacity).toBe('')
    expect(mounted).toHaveBeenCalledOnce()
  })

  it('releases protection on disconnect and reapplies it on reconnect', async () => {
    const dep = deferred()
    const { host } = register({ deps: { dep: () => dep.promise } })
    host.innerHTML = '<h1>Slot</h1>'
    host.style.opacity = '0.6'
    document.body.appendChild(host)
    expect(host.style.opacity).toBe('0')
    host.remove()
    expect(host.style.opacity).toBe('0.6')
    document.body.appendChild(host)
    expect(host.style.opacity).toBe('0')
    dep.resolve({})
    await ready(host)
    expect(host.style.opacity).toBe('0.6')
    expect(host.querySelector('section > h1')?.textContent).toBe('Slot')
  })

  it('releases protection and logs initialization failure', async () => {
    const error = new Error('dependency unavailable')
    const logged = vi.spyOn(logger, 'errorWithContext')
    const { host } = register({
      deps: {
        dep: async () => {
          throw error
        },
      },
    })
    host.innerHTML = '<h1>Slot</h1>'
    host.style.opacity = '0.5'
    document.body.appendChild(host)
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        'Error during initialization',
        expect.any(Object),
        error,
      ),
    )
    expect(host.style.opacity).toBe('0.5')
    expect(host.style.getPropertyValue('transition-property')).toBe('')
    expect(host.querySelector('section')).toBeNull()
  })

  it('does not report a failed render as mounted and can retry on state change', async () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    const logged = vi.spyOn(logger, 'errorWithContext')
    const mounted = vi.fn()
    const { host } = register({
      deps: { mounted: async () => mounted },
      template: '<main><i loop="invalid">{{ item }}</i><slot></slot></main>',
      script: '{ state: { items: null }, mounted() { mounted() } }',
    })
    host.innerHTML = '<h1>Slot</h1>'
    document.body.appendChild(host)
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        'Error during render',
        expect.any(Object),
        expect.objectContaining({
          message: 'Invalid loop binding: expected <id> or [<id>, <id>]',
        }),
      ),
    )
    expect(mounted).not.toHaveBeenCalled()
    expect(host.style.opacity).toBe('')
    host
      .instance!.template.content.querySelector('i')!
      .setAttribute('loop', 'item in items')
    host.instance!.state!.items = ['recovered']
    await Promise.resolve()
    await vi.waitFor(() => expect(frames.length).toBeGreaterThan(0))
    for (let attempt = 0; attempt < 10; attempt++) {
      for (const cb of frames.splice(0)) cb(performance.now())
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (host.querySelector('main')) break
    }
    await ready(host)
    expect(host.querySelector('i')?.textContent).toBe('recovered')
    expect(mounted).toHaveBeenCalledOnce()
  })

  it('allows mounted hooks to await a reactive DOM update before resolving readiness', async () => {
    const waitForText = (element: HTMLElement) =>
      new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (element.textContent !== 'changed') return
          observer.disconnect()
          resolve()
        })
        observer.observe(element, { childList: true, characterData: true, subtree: true })
      })
    const { host } = register({
      deps: { waitForText: async () => waitForText },
      template: '<p ref="label">{{ value }}</p>',
      script: `{ state: { value: 'initial' }, async mounted() {
        this.value = 'changed'; await waitForText($refs.label)
      } }`,
    })
    document.body.appendChild(host)
    await vi.waitFor(() => expect(host.textContent).toBe('changed'))
    await ready(host)
  })

  it('publishes a parent without waiting for a slow slotted child', async () => {
    const dep = deferred()
    const child = register({
      deps: { dep: () => dep.promise },
      template: '<p>Child ready</p>',
    }).host
    child.innerHTML = '<h1>Child raw content</h1>'
    const { host } = register()
    host.appendChild(child)
    document.body.appendChild(host)
    await ready(host)
    expect(host.querySelector('section')).not.toBeNull()
    expect(host.style.opacity).toBe('')
    expect(child.querySelector('p')).toBeNull()
    expect(child.style.opacity).toBe('0')
    dep.resolve({})
    await ready(child)
    expect(child.textContent).toBe('Child ready')
    expect(child.style.opacity).toBe('')
  })

  it('shares CSS with initializing instances and removes it on the last disconnect', async () => {
    const dep = deferred()
    const { name, host } = register({ deps: { dep: () => dep.promise } })
    const second = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host, second)
    expect(document.querySelectorAll(`#style-${name}`)).toHaveLength(1)
    host.remove()
    expect(document.getElementById(`style-${name}`)).not.toBeNull()
    second.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
    dep.resolve({})
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(host.instance).toBeUndefined()
    expect(second.instance).toBeUndefined()
    expect(host.querySelector('section')).toBeNull()
    expect(document.getElementById(`style-${name}`)).toBeNull()
  })

  it('keeps CSS for connected hosts inside a shadow root', async () => {
    const { name, host } = register()
    const rootHost = document.createElement('div')
    document.body.appendChild(rootHost)
    const root = rootHost.attachShadow({ mode: 'open' })
    root.appendChild(host)
    await ready(host)
    const second = document.createElement(name) as HTMLElementWithInstance
    document.body.appendChild(second)
    await ready(second)
    second.remove()
    expect(document.getElementById(`style-${name}`)).not.toBeNull()
    rootHost.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
  })

  it('ignores obsolete initialization after reconnect during dependency loading', async () => {
    const oldDep = deferred()
    const newDep = deferred()
    const load = vi
      .fn()
      .mockReturnValueOnce(oldDep.promise)
      .mockReturnValueOnce(newDep.promise)
    const { host } = register({
      deps: { dep: load },
      script: '{ state: { value: dep } }',
      template: '<p>{{ value }}</p>',
    })
    document.body.appendChild(host)
    host.remove()
    document.body.appendChild(host)
    newDep.resolve('new')
    await ready(host)
    const instance = host.instance
    oldDep.resolve('old')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(host.instance).toBe(instance)
    expect(host.textContent).toBe('new')
  })

  it('keeps live slot nodes connected across frame-sized processing batches', async () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const { host } = register({ template: '<main><slot></slot></main>' })
    const button = document.createElement('button')
    button.textContent = 'Keep me'
    const clicked = vi.fn()
    button.addEventListener('click', clicked)
    host.appendChild(button)
    for (let i = 0; i < 60; i++) {
      const text = document.createElement('span')
      text.textContent = '{{ 1 + 1 }}'
      host.appendChild(text)
    }
    document.body.appendChild(host)
    await vi.waitFor(() => expect(frames.length).toBeGreaterThan(0))
    expect(button.parentNode).toBe(host)
    expect(button.isConnected).toBe(true)
    expect(host.querySelector('main')).toBeNull()
    expect(getComputedStyle(host).opacity).toBe('0')
    for (let i = 0; i < 10; i++) {
      for (const frame of frames.splice(0)) frame(performance.now())
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (host.querySelector('main')) break
    }
    await ready(host)
    expect(host.querySelector('main > button')).toBe(button)
    expect(host.querySelector('span')?.textContent).toBe('2')
    button.click()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('preserves named slots, nested node identity, refs and event bindings', async () => {
    const { host } = register({
      template: '<main><slot name="header"></slot><slot></slot></main>',
      script: '{ state: { clicks: 0 }, methods: { click() { this.clicks++ } } }',
    })
    const header = document.createElement('header')
    header.slot = 'header'
    header.innerHTML = '<button ref="action" onclick="click">{{ 2 + 2 }}</button>'
    const button = header.firstElementChild as HTMLButtonElement
    host.append(header, document.createTextNode('Body'))
    document.body.appendChild(host)
    await ready(host)
    expect(host.querySelector('header')).toBe(header)
    expect(host.querySelector('button')).toBe(button)
    expect(host.instance!.$refs.action).toBe(button)
    expect(button.textContent).toBe('4')
    button.click()
    expect(host.instance!.state!.clicks).toBe(1)
  })

  it('keeps live ref properties and listeners assigned by render hooks', async () => {
    const clicked = vi.fn()
    const { host } = register({
      deps: { clicked: async () => clicked },
      script: `{ state: {}, beforeMount() {
        $refs.field.value = 'hook value'
        $refs.field.setAttribute('data-hook', 'kept')
        $refs.field.addEventListener('click', clicked)
      } }`,
    })
    const field = document.createElement('input')
    field.setAttribute('ref', 'field')
    host.appendChild(field)
    document.body.appendChild(host)
    await ready(host)
    expect(host.querySelector('input')).toBe(field)
    expect(field.value).toBe('hook value')
    expect(field.dataset.hook).toBe('kept')
    field.click()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('preserves an already mounted slotted custom element and its descendants', async () => {
    const child = register({ template: '<button>Child</button>' }).host
    document.body.appendChild(child)
    await ready(child)
    const instance = child.instance
    const button = child.querySelector('button')
    const { host } = register()
    document.body.appendChild(host)
    host.appendChild(child)
    await ready(host)
    expect(host.querySelector(child.tagName)).toBe(child)
    expect(child.instance).toBe(instance)
    expect(child.querySelector('button')).toBe(button)
  })

  it('does not commit slots or mount after disconnect in an async mount hook', async () => {
    const gate = deferred()
    const entered = vi.fn()
    const mounted = vi.fn()
    const { name, host } = register({
      deps: {
        gate: async () => ({ promise: gate.promise }),
        entered: async () => entered,
        mounted: async () => mounted,
      },
      script:
        '{ state: {}, async beforeMount() { entered(); await gate.promise }, mounted() { mounted() } }',
    })
    const button = document.createElement('button')
    host.appendChild(button)
    document.body.appendChild(host)
    await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce())
    expect(button.parentNode).toBe(host)
    host.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
    gate.resolve({})
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(host.querySelector('section')).toBeNull()
    expect(mounted).not.toHaveBeenCalled()
    expect(button.parentNode).toBe(host)
  })

  it('finishes initial rendering when reconnecting during an async created hook', async () => {
    const gate = deferred()
    const entered = vi.fn()
    const mounted = vi.fn()
    const { host } = register({
      template: '<p>Rendered</p>',
      deps: {
        gate: async () => ({ promise: gate.promise }),
        entered: async () => entered,
        mounted: async () => mounted,
      },
      script:
        '{ state: {}, async created() { entered(); await gate.promise }, mounted() { mounted() } }',
    })
    document.body.appendChild(host)
    await vi.waitFor(() => expect(entered).toHaveBeenCalledOnce())
    const instance = host.instance
    host.remove()
    document.body.appendChild(host)
    gate.resolve({})
    await ready(host)
    expect(host.instance).toBe(instance)
    expect(host.textContent).toBe('Rendered')
    expect(mounted).toHaveBeenCalledOnce()
  })

  it('finishes nested initial renders when slot commit reconnects the child', async () => {
    const child = register({ template: '<button>Child</button>' }).host
    const { host } = register()
    host.appendChild(child)
    document.body.appendChild(host)
    await ready(host)
    await ready(child)
    expect(child.querySelector('button')?.textContent).toBe('Child')
  })

  it('can initialize again after teardown finishes', async () => {
    const mounted = vi.fn()
    const { host } = register({
      deps: { mounted: async () => mounted },
      script: '{ state: {}, mounted() { mounted() } }',
    })
    document.body.appendChild(host)
    await ready(host)
    host.remove()
    await vi.waitFor(() => expect(host.instance).toBeUndefined())
    document.body.appendChild(host)
    await ready(host)
    expect(mounted).toHaveBeenCalledTimes(2)
  })

  it('restores CSS and reactive updates when reconnecting a mounted instance', async () => {
    const { name, host } = register({
      template: '<p>{{ value }}</p>',
      script: '{ state: { value: 1 } }',
    })
    document.body.appendChild(host)
    await ready(host)
    const instance = host.instance!
    host.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
    document.body.appendChild(host)
    expect(host.instance).toBe(instance)
    expect(document.getElementById(`style-${name}`)).not.toBeNull()
    instance.state!.value = 2
    await vi.waitFor(() => expect(host.textContent).toBe('2'))
  })
})
