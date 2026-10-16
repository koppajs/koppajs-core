import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import type { ComponentSource, HTMLElementWithInstance } from '../src/types'

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
  document.body.replaceChildren()
  vi.unstubAllGlobals()
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
    expect(host.instance).toBeUndefined()
    dep.resolve({})
    await ready(host)
    host.remove()
    expect(document.getElementById(`style-${name}`)).toBeNull()
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
