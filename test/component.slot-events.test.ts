import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import { bindNativeEvents, bindNativeEventsForComposite } from '../src/event-handler'
import { cleanupSubtree, patchGlobalEventTracking } from '../src/global-event-cleaner'
import type { HTMLElementWithInstance } from '../src/types'

let nextId = 0
let frames: FrameRequestCallback[] = []

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

describe.each(['options', 'composite'] as const)('%s caller slot events', (type) => {
  it('rebinds the original button to fresh state after two complete teardowns', async () => {
    const observed = vi.fn()
    let generation = 0
    const name = `slot-events-${++nextId}`
    registerComponent(name, {
      type,
      template: '<section><b>{{ label }}</b><slot></slot></section>',
      style: '',
      deps: {
        observed: async () => observed,
        nextGeneration: async () => () => ++generation,
      },
      script:
        type === 'options'
          ? `{
              state: { count: 0, label: 'initial', generation: nextGeneration() },
              methods: { click() { this.count++; observed(this) } }
            }`
          : `(() => {
              const state = { count: 0, label: 'initial', generation: nextGeneration() };
              return { state, methods: { click() { state.count++; observed(state) } } };
            })()`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    const button = document.createElement('button')
    button.setAttribute('onclick', 'click')
    host.append(button)
    let previous: HTMLElementWithInstance['instance']
    const oldContexts: { count: number }[] = []

    for (let mount = 0; mount < 3; mount++) {
      document.body.append(host)
      await flushWork()
      const instance = host.instance!
      expect(instance).toBeDefined()
      expect(instance).not.toBe(previous)
      expect(host.querySelector('section > button')).toBe(button)
      expect(button.hasAttribute('onclick')).toBe(false)
      expect(instance.state!.count).toBe(0)

      // Repeated normal updates must not accumulate native listeners.
      for (let update = 0; update < 2; update++) {
        instance.state!.label = `update-${update}`
        await flushWork()
        expect(host.querySelector('b')!.textContent).toBe(`update-${update}`)
        expect(host.querySelector('section > button')).toBe(button)
      }
      button.click()
      await flushWork()
      expect(observed).toHaveBeenCalledTimes(mount + 1)
      const context = observed.mock.calls[mount]![0]
      expect(context.generation).toBe(mount + 1)
      expect(context.count).toBe(1)
      expect(instance.state!.count).toBe(1)
      if (type === 'options') expect(context).toBe(instance.userContext)
      for (const old of oldContexts) expect(old.count).toBe(1)
      oldContexts.push(context)
      previous = instance

      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
      button.click()
      expect(observed).toHaveBeenCalledTimes(mount + 1)
      expect(context.count).toBe(1)
    }
  })

  it('replaces old handlers without cleanup and can restore them after cleanup', () => {
    const bind = type === 'options' ? bindNativeEvents : bindNativeEventsForComposite
    const fragment = document.createDocumentFragment()
    const button = document.createElement('button')
    button.setAttribute('onclick', 'click')
    fragment.append(button)
    const first = vi.fn()
    const second = vi.fn()
    bind({ click: first }, fragment)
    bind({ click: second }, fragment)
    bind({ click: second }, fragment)
    button.click()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(button.hasAttribute('onclick')).toBe(false)

    cleanupSubtree(button)
    button.click()
    expect(second).toHaveBeenCalledOnce()
    bind({ click: second }, fragment)
    button.click()
    expect(second).toHaveBeenCalledTimes(2)
    cleanupSubtree(button)
  })

  it('does not rebind a nested custom element internal handler to its parent', () => {
    const bind = type === 'options' ? bindNativeEvents : bindNativeEventsForComposite
    const childTemplate = document.createDocumentFragment()
    const button = document.createElement('button')
    button.setAttribute('onclick', 'click')
    childTemplate.append(button)
    const childClicked = vi.fn()
    const parentClicked = vi.fn()
    const hostClicked = vi.fn()
    bind({ click: childClicked }, childTemplate)
    const tag = `slot-event-boundary-${++nextId}`
    customElements.define(tag, class extends HTMLElement {})
    const host = document.createElement(tag)
    host.setAttribute('onclick', 'activate')
    host.append(childTemplate)
    const parentTemplate = document.createDocumentFragment()
    parentTemplate.append(host)
    bind({ click: parentClicked, activate: hostClicked }, parentTemplate)
    button.click()
    expect(childClicked).toHaveBeenCalledOnce()
    expect(parentClicked).not.toHaveBeenCalled()
    expect(hostClicked).toHaveBeenCalledOnce()
    cleanupSubtree(host)
  })

  it('does not leave an old context active when the new context has no handler', () => {
    const bind = type === 'options' ? bindNativeEvents : bindNativeEventsForComposite
    const fragment = document.createDocumentFragment()
    const button = document.createElement('button')
    button.setAttribute('onclick', 'click')
    fragment.append(button)
    const first = vi.fn()
    bind({ click: first }, fragment)
    bind({}, fragment)
    button.click()
    expect(first).not.toHaveBeenCalled()
    cleanupSubtree(button)
  })
})
