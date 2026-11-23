const EVENT_REGISTRY = new WeakMap<EventTarget, Set<EventListenerEntry>>()

type EventListenerEntry = {
  type: string
  listener: EventListenerOrEventListenerObject
  registeredListener: EventListenerOrEventListenerObject
  capture: boolean
  signal?: AbortSignal
  cleanupAbort?: () => void
}

function forgetListener(target: EventTarget, entry: EventListenerEntry): void {
  entry.cleanupAbort?.()
  entry.cleanupAbort = undefined
  const entries = EVENT_REGISTRY.get(target)
  entries?.delete(entry)
  if (entries?.size === 0) EVENT_REGISTRY.delete(target)
}

function forgetAbortedListeners(target: EventTarget): void {
  for (const entry of EVENT_REGISTRY.get(target) ?? []) {
    if (entry.signal?.aborted) forgetListener(target, entry)
  }
}

function findListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  capture: boolean,
): EventListenerEntry | undefined {
  forgetAbortedListeners(target)
  for (const entry of EVENT_REGISTRY.get(target) ?? []) {
    if (entry.type === type && entry.listener === listener && entry.capture === capture) {
      return entry
    }
  }
  return undefined
}

function observeListenerAbort(
  target: EventTarget,
  entry: EventListenerEntry,
  signal: AbortSignal,
  nativeAdd: EventTarget['addEventListener'],
  nativeRemove: EventTarget['removeEventListener'],
): () => void {
  // A source abort listener cannot suppress events on a private dependent signal.
  const Signal = signal.constructor as typeof AbortSignal
  const observedSignal = typeof Signal.any === 'function' ? Signal.any([signal]) : signal
  const targetRef = new WeakRef(target)
  const entryRef = new WeakRef(entry)
  const onAbort = () => {
    const currentTarget = targetRef.deref()
    const currentEntry = entryRef.deref()
    if (currentTarget && currentEntry?.signal?.aborted) {
      forgetListener(currentTarget, currentEntry)
    }
  }
  nativeAdd.call(observedSignal, 'abort', onAbort, true)
  return () => nativeRemove.call(observedSignal, 'abort', onAbort, true)
}

let observer: MutationObserver | undefined

/** Internal type for tracking patching status on globalThis */
interface KoppajsGlobalThis {
  __koppajsEventTrackingPatched?: boolean
}

/**
 * Patches EventTarget.prototype.addEventListener/removeEventListener
 * to globally track registered listeners.
 *
 * This only runs when EventTarget exists (browser/JSDOM).
 * In Node/SSR it is a safe no-op.
 */
export function patchGlobalEventTracking(): void {
  if (typeof EventTarget === 'undefined') return

  const g = globalThis as KoppajsGlobalThis

  if (g.__koppajsEventTrackingPatched) return
  g.__koppajsEventTrackingPatched = true

  const nativeAdd = EventTarget.prototype.addEventListener
  const nativeRemove = EventTarget.prototype.removeEventListener

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (arguments.length < 2) {
      return nativeAdd.apply(this, arguments as unknown as Parameters<typeof nativeAdd>)
    }
    if (
      listener == null ||
      (typeof listener !== 'function' && typeof listener !== 'object')
    ) {
      return nativeAdd.call(this, type, listener, options)
    }

    type = `${type}`
    const dictionary =
      options != null && (typeof options === 'object' || typeof options === 'function')
        ? options
        : undefined
    const capture = Boolean(dictionary ? dictionary.capture : options)
    const once = Boolean(dictionary?.once)
    const passive = dictionary?.passive
    const signal = dictionary?.signal
    const normalizedOptions: AddEventListenerOptions = { capture, once }
    // Omission preserves browser-specific passive defaults on document/window.
    if (passive !== undefined) normalizedOptions.passive = Boolean(passive)
    if (signal !== undefined) normalizedOptions.signal = signal

    const existing = findListener(this, type, listener, capture)
    if (existing) {
      // Still let the native method validate new options, including invalid signals.
      return nativeAdd.call(this, type, existing.registeredListener, normalizedOptions)
    }

    const entry: EventListenerEntry = {
      type,
      listener,
      registeredListener: listener,
      capture,
      signal,
    }
    if (once) {
      entry.registeredListener = function (this: EventTarget, event: Event) {
        // Native once removal precedes user code, even reentrant add/dispatch.
        forgetListener(this, entry)
        if (typeof listener === 'function') listener.call(this, event)
        else listener.handleEvent(event)
      }
    }

    nativeAdd.call(this, type, entry.registeredListener, normalizedOptions)
    if (signal?.aborted) return

    const currentEntries = EVENT_REGISTRY.get(this) ?? new Set<EventListenerEntry>()
    currentEntries.add(entry)
    EVENT_REGISTRY.set(this, currentEntries)
    if (signal) {
      try {
        entry.cleanupAbort = observeListenerAbort(
          this,
          entry,
          signal,
          nativeAdd,
          nativeRemove,
        )
        if (signal.aborted) forgetListener(this, entry)
      } catch (error) {
        nativeRemove.call(this, type, entry.registeredListener, capture)
        forgetListener(this, entry)
        throw error
      }
    }
  }

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    if (arguments.length < 2) {
      return nativeRemove.apply(
        this,
        arguments as unknown as Parameters<typeof nativeRemove>,
      )
    }
    if (
      listener == null ||
      (typeof listener !== 'function' && typeof listener !== 'object')
    ) {
      return nativeRemove.call(this, type, listener, options)
    }

    type = `${type}`
    const capture = Boolean(
      options != null && (typeof options === 'object' || typeof options === 'function')
        ? options.capture
        : options,
    )
    const entry = findListener(this, type, listener, capture)
    const result = nativeRemove.call(
      this,
      type,
      entry?.registeredListener ?? listener,
      capture,
    )
    if (entry) forgetListener(this, entry)
    return result
  }
}

/**
 * Removes all listeners registered on a specific EventTarget.
 */
export function cleanupAllEventListeners(target: EventTarget): void {
  const entries = EVENT_REGISTRY.get(target)
  if (!entries) return

  for (const { type, listener, capture } of entries) {
    target.removeEventListener(type, listener, capture)
  }

  EVENT_REGISTRY.delete(target)
}

/**
 * Recursively cleans up all event listeners in a DOM subtree.
 * This is only active in environments where DOM APIs exist.
 */
export function cleanupSubtree(root: Node): void {
  if (
    typeof document === 'undefined' ||
    typeof NodeFilter === 'undefined' ||
    typeof Element === 'undefined'
  ) {
    return
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node: Element | null = root instanceof Element ? root : null

  while (node) {
    if (EVENT_REGISTRY.has(node)) {
      cleanupAllEventListeners(node)
    }
    node = walker.nextNode() as Element | null
  }
}

/**
 * Starts a global MutationObserver that automatically cleans up
 * event listeners from removed DOM elements.
 *
 * In SSR/Node environments this function is a safe no-op.
 */
export function startGlobalDisconnectionObserver(): void {
  if (observer) return
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  if (!document.body) return

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.removedNodes.forEach((removedNode) => {
        if (removedNode.nodeType !== Node.ELEMENT_NODE || removedNode.isConnected) return
        cleanupSubtree(removedNode)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

/**
 * Stops the global observer (useful in tests).
 */
export function stopGlobalDisconnectionObserver(): void {
  if (!observer) return
  observer.disconnect()
  observer = undefined
}
