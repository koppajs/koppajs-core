import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerComponent } from '../src/component'
import { patchGlobalEventTracking } from '../src/global-event-cleaner'
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

describe.each(['options', 'composite'] as const)('%s DOM commit events', (type) => {
  it('keeps SVG selector and ref targets active on preserved nodes after repeated updates', async () => {
    const observed = vi.fn()
    const name = `commit-svg-events-${++nextId}`
    registerComponent(name, {
      type,
      template: `<section ref="area"><svg viewBox="0 0 10 10">
        <circle class="action" cx="5" cy="5" r="1"></circle>
      </svg></section><b>{{ radius }}</b>`,
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: { radius: 1 },
        events: [
          ['click', '.action', function() { observed('selector') }],
          ['click', '$refs.area .action', function() { observed('ref-selector') }],
          ['click', { ref: 'area', selector: '.action' }, function() { observed('object-selector') }]
        ]
      }`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host)
    await flushWork()
    const drawing = host.querySelector('svg')!
    const circle = host.querySelector('circle')!
    expect(circle).toBeInstanceOf(SVGElement)
    expect(circle).not.toBeInstanceOf(HTMLElement)

    for (let radius = 1; radius <= 4; radius++) {
      if (radius > 1) {
        host.instance!.state!.radius = radius
        await flushWork()
      }
      expect(host.querySelector('b')!.textContent).toBe(String(radius))
      expect(host.querySelector('svg')).toBe(drawing)
      expect(host.querySelector('circle')).toBe(circle)
      expect(host.instance!.$refs.area).toBe(host.querySelector('section'))
      observed.mockClear()
      circle.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(observed.mock.calls).toEqual([
        ['selector'],
        ['ref-selector'],
        ['object-selector'],
      ])
    }
  })

  it('captures synchronous connectedCallback events on first mount and replacement', async () => {
    const observed = vi.fn()
    const connected = vi.fn()
    const childName = `commit-connected-child-${++nextId}`
    customElements.define(
      childName,
      class extends HTMLElement {
        connectedCallback() {
          connected(this)
          this.dispatchEvent(new Event('commit-ready'))
        }
      },
    )
    const name = `commit-connected-parent-${++nextId}`
    registerComponent(name, {
      type,
      template: `<${childName} if="show" class="child" ref="child"></${childName}><b>{{ label }}</b>`,
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: { show: true, label: 'initial' },
        events: [
          ['commit-ready', '.child', function(event) { observed('selector', event.target) }],
          ['commit-ready', '$refs.child', function(event) { observed('ref', event.target) }]
        ]
      }`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host)
    await flushWork()
    const first = host.querySelector(childName)!
    expect(connected.mock.calls).toEqual([[first]])
    expect(observed.mock.calls).toEqual([
      ['selector', first],
      ['ref', first],
    ])
    expect(host.instance!.$refs.child).toBe(first)

    host.instance!.state!.show = false
    await flushWork()
    expect(host.querySelector(childName)).toBeNull()
    observed.mockClear()
    first.dispatchEvent(new Event('commit-ready'))
    expect(observed).not.toHaveBeenCalled()

    host.instance!.state!.show = true
    await flushWork()
    const replacement = host.querySelector(childName)!
    expect(replacement).not.toBe(first)
    expect(connected.mock.calls).toEqual([[first], [replacement]])
    expect(observed.mock.calls).toEqual([
      ['selector', replacement],
      ['ref', replacement],
    ])
    expect(host.instance!.$refs.child).toBe(replacement)

    host.instance!.state!.label = 'updated'
    await flushWork()
    expect(host.querySelector('b')!.textContent).toBe('updated')
    expect(host.querySelector(childName)).toBe(replacement)
    expect(host.instance!.$refs.child).toBe(replacement)
    expect(connected).toHaveBeenCalledTimes(2)
    observed.mockClear()
    replacement.dispatchEvent(new Event('commit-ready'))
    expect(observed.mock.calls).toEqual([
      ['selector', replacement],
      ['ref', replacement],
    ])
  })

  it('retains custom-host declarative and structured bindings, live refs and child handler ownership', async () => {
    const observed = vi.fn()
    const childName = `commit-owned-child-${++nextId}`
    registerComponent(childName, {
      type,
      template:
        '<button class="child-action" ref="button" onclick="activate">Child</button>',
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: {},
        methods: { activate(event) { event.stopPropagation(); observed('child-native') } },
        events: [['click', '.child-action', function() { observed('child-structured') }]]
      }`,
    })
    const name = `commit-owned-parent-${++nextId}`
    registerComponent(name, {
      type,
      template: `<${childName} class="child" ref="child" onclick="activate"></${childName}><b>{{ label }}</b>`,
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: { label: 'initial' },
        methods: { activate() { observed('parent-native') } },
        events: [
          ['click', '.child', function() { observed('parent-selector') }],
          ['click', '$refs.child', function() { observed('parent-ref') }],
          ['click', '.child-action', function() { observed('parent-internal') }]
        ]
      }`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host)
    await flushWork()
    const child = host.querySelector(childName) as HTMLElementWithInstance
    const childInstance = child.instance!
    const button = child.querySelector('button')!

    for (let update = 0; update < 4; update++) {
      if (update) {
        host.instance!.state!.label = `update-${update}`
        await flushWork()
        expect(host.querySelector('b')!.textContent).toBe(`update-${update}`)
      }
      expect(host.querySelector(childName)).toBe(child)
      expect(child.instance).toBe(childInstance)
      expect(child.querySelector('button')).toBe(button)
      expect(host.instance!.$refs.child).toBe(child)
      expect(child.instance!.$refs.button).toBe(button)
      observed.mockClear()
      child.dispatchEvent(new MouseEvent('click'))
      expect(observed.mock.calls).toEqual([
        ['parent-native'],
        ['parent-selector'],
        ['parent-ref'],
      ])
      observed.mockClear()
      button.click()
      expect(observed.mock.calls).toEqual([['child-native'], ['child-structured']])
    }
  })
})
