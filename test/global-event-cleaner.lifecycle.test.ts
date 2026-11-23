import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupAllEventListeners,
  patchGlobalEventTracking,
} from '../src/global-event-cleaner'

type Registry = WeakMap<EventTarget, Set<unknown>>
type TrackingGlobal = typeof globalThis & { __koppajsEventTrackingPatched?: boolean }

const eventType = 'koppajs-lifecycle'
const trackingGlobal = globalThis as TrackingGlobal
let nativeAdd: typeof EventTarget.prototype.addEventListener
let nativeRemove: typeof EventTarget.prototype.removeEventListener
let flagDescriptor: PropertyDescriptor | undefined
let targets: Set<EventTarget>
let dom: JSDOM

function target(): EventTarget {
  const result = new EventTarget()
  targets.add(result)
  return result
}

// Observe only the target's registry allocation, never JSDOM's own WeakMaps.
function captureRegistry(target: EventTarget, register: () => void): Registry {
  const nativeSet = WeakMap.prototype.set
  let registry: Registry | undefined
  WeakMap.prototype.set = function (
    this: WeakMap<object, unknown>,
    key: object,
    value: unknown,
  ) {
    if (key === target && value instanceof Set) registry = this as Registry
    return nativeSet.call(this, key, value)
  }
  try {
    register()
  } finally {
    WeakMap.prototype.set = nativeSet
  }
  expect(
    registry,
    'normal registration must expose the private registry allocation',
  ).toBeDefined()
  return registry!
}

function primeRegistry(target: EventTarget): Registry {
  const listener = () => {}
  const registry = captureRegistry(target, () =>
    target.addEventListener(eventType, listener),
  )
  target.removeEventListener(eventType, listener)
  expect(registry.has(target)).toBe(false)
  return registry
}

beforeEach(() => {
  // Vitest's window proxy retains Node AbortController; use one coherent DOM realm.
  dom = new JSDOM('<!doctype html><html><body></body></html>')
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('document', dom.window.document)
  vi.stubGlobal('EventTarget', dom.window.EventTarget)
  vi.stubGlobal('Event', dom.window.Event)
  vi.stubGlobal('AbortSignal', dom.window.AbortSignal)
  vi.stubGlobal('AbortController', dom.window.AbortController)
  nativeAdd = EventTarget.prototype.addEventListener
  nativeRemove = EventTarget.prototype.removeEventListener
  flagDescriptor = Object.getOwnPropertyDescriptor(
    trackingGlobal,
    '__koppajsEventTrackingPatched',
  )
  targets = new Set()
  trackingGlobal.__koppajsEventTrackingPatched = false
  patchGlobalEventTracking()
})

afterEach(() => {
  try {
    for (const target of targets) cleanupAllEventListeners(target)
  } finally {
    vi.restoreAllMocks()
    EventTarget.prototype.addEventListener = nativeAdd
    EventTarget.prototype.removeEventListener = nativeRemove
    if (flagDescriptor) {
      Object.defineProperty(
        trackingGlobal,
        '__koppajsEventTrackingPatched',
        flagDescriptor,
      )
    } else {
      delete trackingGlobal.__koppajsEventTrackingPatched
    }
    dom.window.close()
    vi.unstubAllGlobals()
  }
})

describe('global event tracking listener lifecycle', () => {
  it.each(['document', 'window', 'EventTarget'] as const)(
    'synchronously releases aborted listeners and registry entries on %s',
    (kind) => {
      const current =
        kind === 'document' ? document : kind === 'window' ? window : target()
      targets.add(current)
      const controller = new window.AbortController()
      const listener = vi.fn()
      const registry = captureRegistry(current, () =>
        current.addEventListener(eventType, listener, { signal: controller.signal }),
      )
      const entries = registry.get(current)!
      expect(entries.size).toBe(1)

      controller.abort()

      expect(entries.size).toBe(0)
      expect(registry.has(current)).toBe(false)
      current.dispatchEvent(new Event(eventType))
      expect(listener).not.toHaveBeenCalled()
    },
  )

  it('removes once entries before invoking callbacks and recursive dispatch', () => {
    const current = target()
    let registry: Registry
    const sizes: number[] = []
    const listener = vi.fn(() => {
      sizes.push(registry.get(current)?.size ?? 0)
      current.dispatchEvent(new Event(eventType))
    })
    registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { once: true }),
    )
    const entries = registry.get(current)!

    current.dispatchEvent(new Event(eventType))

    expect(sizes).toEqual([0])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(entries.size).toBe(0)
    expect(registry.has(current)).toBe(false)
  })

  it('allows the same callback to register again inside its once callback', () => {
    const current = target()
    const listener = vi.fn(() => {
      if (listener.mock.calls.length === 1) current.addEventListener(eventType, listener)
    })
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { once: true }),
    )

    current.dispatchEvent(new Event(eventType))
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(3)
    current.removeEventListener(eventType, listener)
    expect(registry.has(current)).toBe(false)
  })

  it('does not create a registry entry for an already-aborted signal', () => {
    const current = target()
    const registry = primeRegistry(current)
    const controller = new window.AbortController()
    controller.abort()
    const listener = vi.fn()

    current.addEventListener(eventType, listener, { signal: controller.signal })

    expect(registry.has(current)).toBe(false)
    current.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
  })

  it('deduplicates by type, callback and capture without replacing once or signal', () => {
    const current = target()
    const original = new window.AbortController()
    const duplicate = new window.AbortController()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, {
        once: true,
        signal: original.signal,
      }),
    )
    current.addEventListener(eventType, listener, { signal: duplicate.signal })
    expect(registry.get(current)?.size).toBe(1)
    duplicate.abort()
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(registry.has(current)).toBe(false)
  })

  it('does not let duplicate options retrofit once or a signal', () => {
    const current = target()
    const controller = new window.AbortController()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener),
    )
    current.addEventListener(eventType, listener, {
      once: true,
      signal: controller.signal,
    })
    expect(registry.get(current)?.size).toBe(1)
    controller.abort()
    current.dispatchEvent(new Event(eventType))
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(registry.get(current)?.size).toBe(1)
  })

  it('keeps original signal ownership after a duplicate registration', () => {
    const current = target()
    const original = new window.AbortController()
    const duplicate = new window.AbortController()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { signal: original.signal }),
    )
    current.addEventListener(eventType, listener, { signal: duplicate.signal })
    original.abort()
    expect(registry.has(current)).toBe(false)
    current.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'removes capture=%s independently of its counterpart',
    (capture) => {
      const current = target()
      const listener = vi.fn()
      const registry = captureRegistry(current, () =>
        current.addEventListener(eventType, listener, true),
      )
      current.addEventListener(eventType, listener, false)
      expect(registry.get(current)?.size).toBe(2)
      current.removeEventListener(eventType, listener, capture)
      expect(registry.get(current)?.size).toBe(1)
      current.dispatchEvent(new Event(eventType))
      expect(listener).toHaveBeenCalledTimes(1)
      current.removeEventListener(eventType, listener, !capture)
      expect(registry.has(current)).toBe(false)
    },
  )

  it('does not change the registry when removing with the wrong capture', () => {
    const current = target()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, true),
    )
    current.removeEventListener(eventType, listener, false)
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('preserves handleEvent receiver and resolves its current method on each dispatch', () => {
    const current = target()
    const receivers: unknown[] = []
    const first = vi.fn(function (this: EventListenerObject) {
      receivers.push(this)
    })
    const second = vi.fn(function (this: EventListenerObject) {
      receivers.push(this)
    })
    const listener = { handleEvent: first }
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener),
    )
    current.dispatchEvent(new Event(eventType))
    listener.handleEvent = second
    current.dispatchEvent(new Event(eventType))
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(receivers).toEqual([listener, listener])
    current.removeEventListener(eventType, listener)
    expect(registry.has(current)).toBe(false)
  })

  it('removes once listeners explicitly before their first invocation', () => {
    const current = target()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { once: true }),
    )
    current.removeEventListener(eventType, listener)
    current.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
    expect(registry.has(current)).toBe(false)
  })

  it('cleans up using stored normalized capture after caller options mutate', () => {
    const current = target()
    const listener = vi.fn()
    const options = { capture: true }
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, options),
    )
    options.capture = false
    cleanupAllEventListeners(current)
    current.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
    expect(registry.has(current)).toBe(false)
  })

  it('does not leave phantom entries when native signal validation throws', () => {
    const current = target()
    const registry = primeRegistry(current)
    const listener = vi.fn()
    expect(() =>
      current.addEventListener(eventType, listener, { signal: {} as AbortSignal }),
    ).toThrow(TypeError)
    expect(registry.has(current)).toBe(false)
  })

  it('validates an invalid signal even when callback identity is already registered', () => {
    const current = target()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener),
    )
    expect(() =>
      current.addEventListener(eventType, listener, { signal: {} as AbortSignal }),
    ).toThrow(TypeError)
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ignores synthetic abort events while the source signal is not aborted', () => {
    const current = target()
    const controller = new window.AbortController()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { signal: controller.signal }),
    )
    controller.signal.dispatchEvent(new Event('abort'))
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
    controller.abort()
    expect(registry.has(current)).toBe(false)
  })

  it('preserves native function listener this during once dispatch', () => {
    const current = target()
    const receivers: unknown[] = []
    const listener = vi.fn(function (this: EventTarget) {
      receivers.push(this)
    })
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { once: true }),
    )
    current.dispatchEvent(new Event(eventType))
    expect(receivers).toEqual([current])
    expect(registry.has(current)).toBe(false)
  })

  it('resolves an object once listener dynamically with its original receiver', () => {
    const current = target()
    const registry = primeRegistry(current)
    const first = vi.fn()
    const observations: unknown[] = []
    const listener = {
      handleEvent: first,
    }
    current.addEventListener(eventType, listener, { once: true })
    listener.handleEvent = vi.fn(function (this: EventListenerObject) {
      observations.push(this, registry.get(current)?.size ?? 0)
    })
    current.dispatchEvent(new Event(eventType))
    current.dispatchEvent(new Event(eventType))
    expect(first).not.toHaveBeenCalled()
    expect(listener.handleEvent).toHaveBeenCalledTimes(1)
    expect(observations).toEqual([listener, 0])
    expect(registry.has(current)).toBe(false)
  })

  it('does not leave phantom entries when an options getter throws', () => {
    const current = target()
    const registry = primeRegistry(current)
    const failure = new Error('capture getter failed')
    expect(() =>
      current.addEventListener(eventType, () => {}, {
        get capture(): boolean {
          throw failure
        },
      }),
    ).toThrow(failure)
    expect(registry.has(current)).toBe(false)
  })

  it.each(['remove', 'once', 'cleanup'] as const)(
    'releases its internal abort hook after %s',
    (operation) => {
      // Install native spies before patching so internal hooks cannot bypass observation.
      EventTarget.prototype.addEventListener = nativeAdd
      EventTarget.prototype.removeEventListener = nativeRemove
      const add = vi.spyOn(EventTarget.prototype, 'addEventListener')
      const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener')
      trackingGlobal.__koppajsEventTrackingPatched = false
      patchGlobalEventTracking()
      const current = target()
      const controller = new window.AbortController()
      const listener = vi.fn()
      current.addEventListener(eventType, listener, {
        once: operation === 'once',
        signal: controller.signal,
      })
      const hooks = add.mock.calls.flatMap((args, index) =>
        add.mock.contexts[index] instanceof window.AbortSignal && args[0] === 'abort'
          ? [{ signal: add.mock.contexts[index], listener: args[1] }]
          : [],
      )
      expect(hooks.length).toBeGreaterThan(0)
      if (operation === 'remove') current.removeEventListener(eventType, listener)
      else if (operation === 'once') current.dispatchEvent(new Event(eventType))
      else cleanupAllEventListeners(current)
      for (const hook of hooks) {
        expect(
          remove.mock.calls.some(
            (args, index) =>
              remove.mock.contexts[index] === hook.signal &&
              args[0] === 'abort' &&
              args[1] === hook.listener,
          ),
        ).toBe(true)
      }
    },
  )

  it.skipIf(typeof window.AbortSignal.any !== 'function')(
    'cleans registry state even when an earlier original abort listener stops propagation',
    () => {
      const current = target()
      const controller = new window.AbortController()
      nativeAdd.call(controller.signal, 'abort', (event) =>
        event.stopImmediatePropagation(),
      )
      const listener = vi.fn()
      const registry = captureRegistry(current, () =>
        current.addEventListener(eventType, listener, { signal: controller.signal }),
      )
      controller.abort()
      expect(registry.has(current)).toBe(false)
      current.dispatchEvent(new Event(eventType))
      expect(listener).not.toHaveBeenCalled()
    },
  )

  it('preserves a signal-free reentrant registration during the original abort event', () => {
    const current = target()
    const controller = new window.AbortController()
    const listener = vi.fn()
    nativeAdd.call(controller.signal, 'abort', () =>
      current.addEventListener(eventType, listener),
    )
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { signal: controller.signal }),
    )
    controller.abort()
    expect(registry.get(current)?.size).toBe(1)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
    current.removeEventListener(eventType, listener)
    expect(registry.has(current)).toBe(false)
  })

  it('keeps a live registration when a duplicate uses an already-aborted signal', () => {
    const current = target()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener),
    )
    const controller = new window.AbortController()
    controller.abort()
    current.addEventListener(eventType, listener, {
      once: true,
      signal: controller.signal,
    })
    current.dispatchEvent(new Event(eventType))
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(registry.get(current)?.size).toBe(1)
  })

  it('reads caller option getters once and preserves passive cancellation', () => {
    const current = target()
    const reads: string[] = []
    const listener = vi.fn((event: Event) => event.preventDefault())
    current.addEventListener(eventType, listener, {
      get capture() {
        reads.push('capture')
        return false
      },
      get once() {
        reads.push('once')
        return true
      },
      get passive() {
        reads.push('passive')
        return false
      },
      get signal() {
        reads.push('signal')
        return undefined
      },
    })
    const event = new Event(eventType, { cancelable: true })
    current.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(reads).toEqual(['capture', 'once', 'passive', 'signal'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not forget an active registration when removal options throw', () => {
    const current = target()
    const listener = vi.fn()
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener),
    )
    const failure = new Error('remove capture failed')
    expect(() =>
      current.removeEventListener(eventType, listener, {
        get capture(): boolean {
          throw failure
        },
      }),
    ).toThrow(failure)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(registry.get(current)?.size).toBe(1)
  })

  it('cleans the registry before native error reporting for a throwing once callback', () => {
    const current = target()
    const failure = new Error('once callback failed')
    const errors: unknown[] = []
    const onError = (event: Event) => {
      errors.push((event as ErrorEvent).error)
      event.preventDefault()
    }
    nativeAdd.call(window, 'error', onError)
    try {
      const listener = vi.fn(() => {
        throw failure
      })
      const registry = captureRegistry(current, () =>
        current.addEventListener(eventType, listener, { once: true }),
      )
      expect(() => current.dispatchEvent(new Event(eventType))).not.toThrow()
      current.dispatchEvent(new Event(eventType))
      expect(errors).toEqual([failure])
      expect(listener).toHaveBeenCalledTimes(1)
      expect(registry.has(current)).toBe(false)
    } finally {
      nativeRemove.call(window, 'error', onError)
    }
  })

  it('falls back to source capture observation without AbortSignal.any', () => {
    Object.defineProperty(window.AbortSignal, 'any', {
      value: undefined,
      configurable: true,
    })
    const current = target()
    const listener = vi.fn()
    const controller = new window.AbortController()
    nativeAdd.call(controller.signal, 'abort', (event) =>
      event.stopImmediatePropagation(),
    )
    const registry = captureRegistry(current, () =>
      current.addEventListener(eventType, listener, { signal: controller.signal }),
    )
    controller.signal.dispatchEvent(new Event('abort'))
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(registry.get(current)?.size).toBe(1)
    controller.abort()
    expect(registry.has(current)).toBe(false)
    current.dispatchEvent(new Event(eventType))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('rolls back native registration if internal abort observation fails', () => {
    const current = target()
    const registry = primeRegistry(current)
    const controller = new window.AbortController()
    const failure = new Error('dependent signal failed')
    vi.spyOn(window.AbortSignal, 'any').mockImplementation(() => {
      throw failure
    })
    const listener = vi.fn()
    expect(() =>
      current.addEventListener(eventType, listener, { signal: controller.signal }),
    ).toThrow(failure)
    current.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
    expect(registry.has(current)).toBe(false)
  })

  it('synchronously releases listeners on multiple targets sharing one signal', () => {
    const first = target()
    const second = target()
    const controller = new window.AbortController()
    const listener = vi.fn()
    const registry = captureRegistry(first, () =>
      first.addEventListener(eventType, listener, { signal: controller.signal }),
    )
    second.addEventListener(eventType, listener, { signal: controller.signal })
    const firstEntries = registry.get(first)!
    const secondEntries = registry.get(second)!
    controller.abort()
    expect(firstEntries.size).toBe(0)
    expect(secondEntries.size).toBe(0)
    expect(registry.has(first)).toBe(false)
    expect(registry.has(second)).toBe(false)
    first.dispatchEvent(new Event(eventType))
    second.dispatchEvent(new Event(eventType))
    expect(listener).not.toHaveBeenCalled()
  })
})
