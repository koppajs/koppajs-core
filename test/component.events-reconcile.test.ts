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

describe.each(['options', 'composite'] as const)('%s reconciled DOM events', (type) => {
  it('keeps selector, ref, window and declarative targets live across updates and full remounts', async () => {
    const observed = vi.fn()
    let generation = 0
    const name = `reconciled-events-${++nextId}`
    registerComponent(name, {
      type,
      template: `<section ref="area"><b>{{ label }}</b>
        <button class="action" ref="action" onclick="activate">Action</button>
      </section>`,
      style: '',
      deps: {
        observed: async () => observed,
        nextGeneration: async () => () => ++generation,
      },
      script: `(() => { const generation = nextGeneration(); return {
        state: { label: 'initial', generation },
        methods: { activate() { observed('native', ${type === 'options' ? 'this.generation' : 'generation'}) } },
        events: [
          ['click', '.action', function() { observed('selector', this.generation) }],
          ['click', '$refs.action', function() { observed('ref', this.generation) }],
          ['click', '$refs.area .action', function() { observed('ref-selector', this.generation) }],
          ['click', { ref: 'action' }, function() { observed('object-ref', this.generation) }],
          ['click', { ref: 'area', selector: '.action' }, function() { observed('object-selector', this.generation) }],
          ['reconciled-ping', 'window', function() { observed('window', this.generation) }]
        ]
      } })()`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    const kinds = [
      'native',
      'selector',
      'ref',
      'ref-selector',
      'object-ref',
      'object-selector',
      'window',
    ]

    for (let mount = 1; mount <= 3; mount++) {
      document.body.append(host)
      await flushWork()
      const instance = host.instance!
      expect(instance).toBeDefined()
      const button = host.querySelector('button')!
      for (let update = 0; update < 4; update++) {
        if (update) {
          instance.state!.label = `update-${update}`
          await flushWork()
          expect(host.querySelector('b')!.textContent).toBe(`update-${update}`)
        }
        expect(host.querySelector('button')).toBe(button)
        observed.mockClear()
        button.click()
        window.dispatchEvent(new Event('reconciled-ping'))
        expect(observed.mock.calls).toEqual(kinds.map((kind) => [kind, mount]))
        expect(instance.$refs.action).toBe(button)
        expect(instance.$refs.area).toBe(host.querySelector('section'))
      }
      host.remove()
      await flushWork()
      expect(host.instance).toBeUndefined()
      observed.mockClear()
      button.click()
      window.dispatchEvent(new Event('reconciled-ping'))
      expect(observed).not.toHaveBeenCalled()
    }
  })

  it('replaces and removes declarative handlers on a retained native element', async () => {
    const observed = vi.fn()
    const name = `reconciled-native-${++nextId}`
    registerComponent(name, {
      type,
      template: '<button onclick="{{ handler }}">{{ label }}</button>',
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: { handler: 'first', label: 'initial' },
        methods: { first() { observed('first') }, second() { observed('second') } }
      }`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host)
    await flushWork()
    const button = host.querySelector('button')!
    button.click()
    expect(observed.mock.calls).toEqual([['first']])
    host.instance!.state!.handler = 'second'
    await flushWork()
    expect(host.querySelector('button')).toBe(button)
    button.click()
    expect(observed.mock.calls).toEqual([['first'], ['second']])
    host.instance!.state!.handler = ''
    await flushWork()
    button.click()
    expect(observed).toHaveBeenCalledTimes(2)
  })

  it('cleans removed structured targets and binds replacement nodes once', async () => {
    const observed = vi.fn()
    const name = `reconciled-replacement-${++nextId}`
    registerComponent(name, {
      type,
      template: '<button if="show" class="action">Action</button><b>{{ label }}</b>',
      style: '',
      deps: { observed: async () => observed },
      script: `{
        state: { show: true, label: 'initial' },
        events: [['click', '.action', function() { observed() }]]
      }`,
    })
    const host = document.createElement(name) as HTMLElementWithInstance
    document.body.append(host)
    await flushWork()
    const removed = host.querySelector('button')!
    removed.click()
    expect(observed).toHaveBeenCalledOnce()
    host.instance!.state!.show = false
    await flushWork()
    expect(host.querySelector('button')).toBeNull()
    removed.click()
    expect(observed).toHaveBeenCalledOnce()
    host.instance!.state!.show = true
    await flushWork()
    const replacement = host.querySelector('button')!
    expect(replacement).not.toBe(removed)
    replacement.click()
    host.instance!.state!.label = 'updated'
    await flushWork()
    replacement.click()
    expect(observed).toHaveBeenCalledTimes(3)
  })
})
